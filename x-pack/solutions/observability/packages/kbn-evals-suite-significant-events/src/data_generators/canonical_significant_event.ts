/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';

export interface ToSignificantEventSeedParams {
  /** A discovery the investigator produced in a prior cycle. */
  discovery: Partial<SignificantEvent>;
  /** Fallback event ID when the discovery does not provide one. */
  eventId: string;
}

/**
 * Map a produced discovery into a `SignificantEvent` document suitable for indexing into
 * `.rule-events` between continuation cycles. The seeded doc has `status: "active"`
 * so the next cycle's `event_search state: "active"` call picks it up for continuation routing.
 */
export function canonicalSignificantEventFromGroundTruth({
  discovery,
  eventId,
}: ToSignificantEventSeedParams): SignificantEvent {
  const signals = discovery.signals ?? [];
  const sourceIds = [
    ...new Set(signals.map((s) => s.source_id).filter((name): name is string => Boolean(name))),
  ];

  const now = new Date().toISOString();
  return {
    '@timestamp': now,
    event_id: discovery.event_id ?? eventId,
    status: 'active',
    severity: discovery.severity ?? 'medium',
    source_ids: sourceIds.length > 0 ? sourceIds : ['unknown'],
    title: discovery.title ?? 'eval-seeded-event',
    symptom_hypothesis: discovery.symptom_hypothesis,
    summary: discovery.summary ?? '',
    confidence: discovery.confidence ?? 0.5,
    causal_features: discovery.causal_features,
    blast_radius: discovery.blast_radius,
    signals: discovery.signals,
  };
}
