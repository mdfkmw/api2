'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import Navbar from '@/components/Navbar'
import { fetchCheckoutStatus, retryPublicCheckout, ApiError } from '@/lib/api'

type ViewState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'pending'; expired?: boolean }
  | {
      kind: 'paid'
      reservationIds?: number[]
      summary?: {
        trip_date: string
        departure_time: string
        route_name: string
        board_at: string
        exit_at: string
        seat_count: number
        discount_total: number
        promo_total: number
        paid_amount: number
        currency: string
      } | null
    }

export default function CheckoutFinishClient() {
  const sp = useSearchParams()

  const orderId = useMemo(() => {
    const raw = sp.get('order_id')
    const id = raw ? Number(raw) : NaN
    return Number.isFinite(id) && id > 0 ? id : null
  }, [sp])

  const [state, setState] = useState<ViewState>({ kind: 'loading' })

  useEffect(() => {
    if (!orderId) {
      setState({ kind: 'error', message: 'Lipsește order_id din link.' })
      return
    }

    let mounted = true

    const run = async () => {
      try {
        const resp = await fetchCheckoutStatus(orderId)
        if (!mounted) return

        if (resp.paid) {
          setState({
            kind: 'paid',
            reservationIds: resp.reservation_ids,
            summary: resp.summary ?? null,
          })
        } else {
          setState({ kind: 'pending', expired: resp.expired })
        }
      } catch (err: any) {
        if (!mounted) return
        if (err instanceof ApiError) {
          setState({ kind: 'error', message: err.message })
          return
        }
        setState({ kind: 'error', message: 'Nu am putut verifica statusul plății.' })
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [orderId])

  const handleRetry = async () => {
    if (!orderId) return
    try {
      setState({ kind: 'loading' })
      const resp = await retryPublicCheckout(orderId)
      if (resp.form_url) {
        window.location.href = resp.form_url
        return
      }
      setState({ kind: 'error', message: 'Nu am primit link nou de plată.' })
    } catch (err: any) {
      if (err instanceof ApiError) {
        setState({ kind: 'error', message: err.message })
        return
      }
      setState({ kind: 'error', message: 'Nu am putut reiniția plata.' })
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl p-6">
        {/* restul JSX-ului tău rămâne IDENTIC */}
      </main>
    </>
  )
}
