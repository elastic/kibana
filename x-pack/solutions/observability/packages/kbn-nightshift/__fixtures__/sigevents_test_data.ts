/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LatestSignificantEventData } from '../hooks/use_fetch_latest_significant_event';

export const SIGEVENTS_EVENTS_INDEX = 'sigevents-events-ms';
export const SIGEVENTS_DETECTIONS_INDEX = 'sigevents-detections-ms';

/**
 * Creates acknowledged event documents stamped with the given timestamp.
 */
export const makeAcknowledgedEvents = (timestamp: string) => [
  {
    '@timestamp': timestamp,
    event_id: 'scout-event-stderr-output',
    verdict_id: 'scout-verdict-stderr-output',
    discovery_id: 'scout-disc-stderr-output',
    discovery_slug: 'multi-service__stderr-output-across-services',
    verdict: 'acknowledged',
    title: 'multi-service — elevated stderr output',
    summary:
      'Stderr output across services shifted at 19:28Z with high sustained volume (2031 alerts). Direct keyword search for stderr text returned no hits in the same stream.',
    root_cause:
      'Multiple services are emitting more stderr-formatted output, consistent with increased exception/stack-trace style logging.',
    rule_names: ['Stderr output across services'],
    stream_names: ['logs.otel'],
    cause_kis: [],
    evidences: [],
    criticality: 40,
    impact: 'medium',
    recommended_action: 'investigate',
    recommendations: [
      'Query logs.otel using a stats aggregation on resource.attributes.app to identify which services are generating the increased output volume.',
      'Inspect log level distribution in logs.otel over the last hour using severity_text fields.',
    ],
    last_reviewed_at: timestamp,
  },
  {
    '@timestamp': timestamp,
    event_id: 'scout-event-otel-retries',
    verdict_id: 'scout-verdict-otel-retries',
    discovery_id: 'scout-disc-otel-retries',
    discovery_slug: 'otel-collector__otel-exporter-retry-activity',
    verdict: 'acknowledged',
    title: 'otel-collector — OTLP exporter retries',
    summary:
      'OTel exporter retry activity spiked at 19:28Z (3 alerts). Dependencies in this environment show multiple services exporting to the otel-collector.',
    root_cause:
      'Telemetry exporters are retrying because the otel-collector endpoint is unavailable to clients (transport-level connection failures).',
    rule_names: ['OTel exporter retry activity'],
    stream_names: ['logs.otel'],
    dependency_edges: [
      {
        exposure: 'exposed',
        protocol: 'grpc',
        source: 'recommendation',
        target: 'otel-collector',
      },
    ],
    cause_kis: [],
    evidences: [],
    criticality: 30,
    impact: 'low',
    recommended_action: 'monitor',
    recommendations: [
      'Verify otel-collector pod health and readiness in the otel-demo namespace.',
      'Inspect recommendation service logs for StatusCode.UNAVAILABLE export errors.',
    ],
    last_reviewed_at: timestamp,
  },
];

/**
 * Creates Act 1 detection documents (non-superseded).
 */
export const makeAct1Detections = (timestamp: string) => [
  {
    '@timestamp': timestamp,
    detection_id: 'scout-det-stderr',
    parent_detection_id: '',
    rule_name: 'Stderr output across services',
    rule_uuid: '4d80d275-02b7-5503-8764-e72663b75879',
    stream: 'logs.otel',
    alert_count: 2065,
  },
  {
    '@timestamp': timestamp,
    detection_id: 'scout-det-otel-retry',
    parent_detection_id: '',
    rule_name: 'OTel exporter retry activity',
    rule_uuid: 'e2f233d1-c56e-51af-8b05-4422b645a8d4',
    stream: 'logs.otel',
    alert_count: 3,
  },
];

/**
 * Creates promoted significant event documents for Act 2.
 */
export const makePromotedEvents = (timestamp: string) => [
  {
    '@timestamp': timestamp,
    event_id: 'scout-event-payment-failures',
    discovery_id: 'scout-disc-payment-failures',
    discovery_slug: 'payment__payment-processing-failures',
    verdict: 'promoted',
    title: 'payment — charge processing failures',
    summary:
      'The payment processing failures rule is firing at high volume (2,528 events) with a stable pattern and is re-firing after a brief clear. Recent log matches show repeated charge failures driven by downstream connection-refused errors during gRPC calls.',
    root_cause:
      'Payment processing is failing because the payment service cannot establish a connection to its downstream card-charging dependency (connection refused), leading to gRPC Unavailable/INTERNAL charge failures. Checkout is exposed because it depends on payment for order placement (checkout → payment).',
    rule_names: ['Payment processing failures'],
    stream_names: ['logs.otel'],
    dependency_edges: [
      {
        protocol: 'internal',
        exposure: 'exposed',
        source: 'checkout',
        target: 'payment',
      },
    ],
    cause_kis: [{ stream_name: 'logs.otel', name: 'payment-service' }],
    evidences: [
      {
        result: 'found',
        stream_name: 'logs.otel',
        rule_name: 'Payment processing failures',
        description:
          'Matched recent payment/charge error logs showing gRPC charge failures where the downstream dial attempt is refused.',
        esql_query:
          'FROM logs.otel, logs.otel.* | WHERE @timestamp >= NOW() - 120 minutes AND @timestamp <= NOW() | WHERE ((body.text : "payment") OR (body.text : "charge")) AND ((body.text : "fail") OR (body.text : "error") OR (body.text : "refused")) | KEEP @timestamp, body.text | SORT @timestamp DESC | LIMIT 5',
        confirmed: true,
        row_count: 5,
        collected_at: timestamp,
      },
    ],
    criticality: 90,
    recommended_action: 'escalate',
    impact: 'critical',
    recommendations: [
      'Inspect the payment service downstream card-charge dependency — verify the target host and port are reachable.',
      'Check checkout service error rates and order placement success.',
      'Query logs.otel for payment and charge error logs filtered to the last 30 minutes.',
    ],
    verdict_id: 'scout-verdict-payment-failures',
    last_reviewed_at: timestamp,
  },
  {
    '@timestamp': timestamp,
    event_id: 'scout-event-grpc-connection',
    discovery_id: 'scout-disc-grpc-connection',
    discovery_slug: 'frontend__grpc-connection-refused-errors',
    verdict: 'promoted',
    title: 'frontend — gRPC connection failures',
    summary:
      'The gRPC connection refused errors rule spiked starting around the 19:00 window (peak 22 alerts/30m). Recent log matches show repeated ECONNREFUSED leading to gRPC UNAVAILABLE client failures during backend calls.',
    root_cause:
      'The frontend is encountering gRPC UNAVAILABLE errors because a downstream gRPC backend is refusing TCP connections (ECONNREFUSED), preventing the frontend API routes from completing backend calls.',
    rule_names: ['gRPC connection refused errors'],
    stream_names: ['logs.otel'],
    dependency_edges: [
      {
        protocol: 'grpc',
        exposure: 'not_exposed',
        source: 'frontend',
        target: 'cart',
      },
    ],
    cause_kis: [{ stream_name: 'logs.otel', name: 'frontend' }],
    evidences: [
      {
        result: 'found',
        stream_name: 'logs.otel',
        rule_name: 'gRPC connection refused errors',
        description:
          'Matched recent gRPC client errors where requests fail with ECONNREFUSED and gRPC UNAVAILABLE when trying to connect to a backend endpoint.',
        esql_query:
          'FROM logs.otel, logs.otel.* | WHERE @timestamp >= NOW() - 120 minutes AND @timestamp <= NOW() | WHERE body.text : "ECONNREFUSED" | KEEP @timestamp, body.text | SORT @timestamp DESC | LIMIT 5',
        confirmed: true,
        row_count: 5,
        collected_at: timestamp,
      },
    ],
    criticality: 70,
    recommended_action: 'escalate',
    impact: 'high',
    recommendations: [
      'Verify cart service pod health and port 7070 availability in the otel-demo namespace.',
      'Check frontend API route error rates for the cart endpoint.',
      'Query logs.otel filtered to ECONNREFUSED in the last 30 minutes.',
    ],
    verdict_id: 'scout-verdict-grpc-connection',
    last_reviewed_at: timestamp,
  },
];

/**
 * Creates Act 2 acknowledged events (includes extra dependency edges vs Act 1).
 */
export const makeAct2AcknowledgedEvents = (timestamp: string) => [
  {
    '@timestamp': timestamp,
    event_id: 'scout-event-stderr-output',
    verdict_id: 'scout-verdict-stderr-output',
    discovery_id: 'scout-disc-stderr-output',
    discovery_slug: 'multi-service__stderr-output-across-services',
    verdict: 'acknowledged',
    title: 'multi-service — elevated stderr output',
    summary:
      'Stderr output across services shifted at 19:28Z with high sustained volume (2031 alerts). Direct keyword search for stderr text returned no hits in the same stream.',
    root_cause:
      'Multiple services are emitting more stderr-formatted output, consistent with increased exception/stack-trace style logging.',
    rule_names: ['Stderr output across services'],
    stream_names: ['logs.otel'],
    cause_kis: [],
    evidences: [],
    criticality: 40,
    impact: 'medium',
    recommended_action: 'investigate',
    recommendations: [
      'Query logs.otel using a stats aggregation on resource.attributes.app to identify which services are generating the increased output volume.',
      'Inspect log level distribution in logs.otel over the last hour using severity_text fields.',
    ],
    last_reviewed_at: timestamp,
  },
  {
    '@timestamp': timestamp,
    event_id: 'scout-event-otel-retries',
    verdict_id: 'scout-verdict-otel-retries',
    discovery_id: 'scout-disc-otel-retries',
    discovery_slug: 'otel-collector__otel-exporter-retry-activity',
    verdict: 'acknowledged',
    title: 'otel-collector — OTLP exporter retries',
    summary:
      'OTel exporter retry activity spiked at 19:28Z (3 alerts). Dependencies in this environment show multiple services exporting to the otel-collector.',
    root_cause:
      'Telemetry exporters are retrying because the otel-collector endpoint is unavailable to clients (transport-level connection failures).',
    rule_names: ['OTel exporter retry activity'],
    stream_names: ['logs.otel'],
    dependency_edges: [
      {
        exposure: 'exposed',
        protocol: 'grpc',
        source: 'recommendation',
        target: 'otel-collector',
      },
      {
        exposure: 'exposed',
        protocol: 'http',
        source: 'ad',
        target: 'otel-collector',
      },
    ],
    cause_kis: [],
    evidences: [],
    criticality: 30,
    impact: 'low',
    recommended_action: 'monitor',
    recommendations: [
      'Verify otel-collector pod health and readiness in the otel-demo namespace.',
      'Inspect recommendation service logs for StatusCode.UNAVAILABLE export errors.',
    ],
    last_reviewed_at: timestamp,
  },
];

/**
 * Creates Act 2 detections (mix of superseded and active).
 */
export const makeAct2Detections = (timestamp: string) => [
  {
    '@timestamp': timestamp,
    detection_id: 'scout-det-payment-failures',
    parent_detection_id: '',
    rule_name: 'Payment processing failures',
    rule_uuid: '9997139f-d644-5456-93c5-31e6e4ce8920',
    stream: 'logs.otel',
    alert_count: 2040,
    superseded: true,
  },
  {
    '@timestamp': timestamp,
    detection_id: 'scout-det-grpc-errors',
    parent_detection_id: '',
    rule_name: 'gRPC connection refused errors',
    rule_uuid: '6c3d74de-8a5a-5579-bd04-ceeca719594b',
    stream: 'logs.otel',
    alert_count: 22,
    superseded: true,
  },
  {
    '@timestamp': timestamp,
    detection_id: 'scout-det-otel-retry',
    parent_detection_id: '',
    rule_name: 'OTel exporter retry activity',
    rule_uuid: 'e2f233d1-c56e-51af-8b05-4422b645a8d4',
    stream: 'logs.otel',
    alert_count: 3,
    superseded: true,
  },
  {
    '@timestamp': timestamp,
    detection_id: 'scout-det-stderr',
    parent_detection_id: '',
    rule_name: 'Stderr output across services',
    rule_uuid: '4d80d275-02b7-5503-8764-e72663b75879',
    stream: 'logs.otel',
    alert_count: 2065,
    superseded: true,
  },
  {
    '@timestamp': timestamp,
    detection_id: 'scout-det-valkey-persistence',
    parent_detection_id: '',
    rule_name: 'Valkey database persistence events',
    rule_uuid: '6b1e9a78-eae9-5de3-8d21-2b5de2430268',
    stream: 'logs.otel',
    alert_count: 33,
  },
  {
    '@timestamp': timestamp,
    detection_id: 'scout-det-credit-card',
    parent_detection_id: '',
    rule_name: 'Credit card data exposure in logs',
    rule_uuid: '62003d67-8333-59e3-85f8-357e3d9e4b90',
    stream: 'logs.otel',
    alert_count: 1,
  },
  {
    '@timestamp': timestamp,
    detection_id: 'scout-det-shipping',
    parent_detection_id: '',
    rule_name: 'Shipping tracking ID creation',
    rule_uuid: '5ac6413d-55be-5dd3-91f2-1621215b4ef2',
    stream: 'logs.otel',
    alert_count: 1,
  },
];

// ---------------------------------------------------------------------------
// Story-friendly derived shapes
// ---------------------------------------------------------------------------

const mapImpactToSeverity = (
  impact: string
): {
  label: string;
  color: 'danger' | 'warning' | 'primary' | 'subdued';
  state: 'critical' | 'warning' | 'healthy';
} => {
  switch (impact) {
    case 'critical':
      return { label: 'Critical', color: 'danger', state: 'critical' };
    case 'high':
      return { label: 'High', color: 'warning', state: 'warning' };
    case 'medium':
      return { label: 'Medium', color: 'primary', state: 'warning' };
    case 'low':
    default:
      return { label: 'Low', color: 'subdued', state: 'healthy' };
  }
};

/**
 * Converts the raw promoted event documents into `LatestSignificantEventData`
 * objects usable by Storybook stories and unit tests.
 */
export const makePromotedEventsData = (timestamp: string): LatestSignificantEventData[] =>
  makePromotedEvents(timestamp).map((doc) => {
    const severity = mapImpactToSeverity(doc.impact);
    const causeKis = (doc.cause_kis ?? []) as Array<{ name: string; stream_name: string }>;
    const edges = (doc.dependency_edges ?? []) as Array<{
      source: string;
      target: string;
      protocol: string;
      exposure: string;
    }>;

    // Derive impacted services from dependency edges (matching hook logic)
    const edgeDerivedServices = edges.reduce<
      Array<{ id: string; label: string; iconType: string }>
    >((acc, edge) => {
      for (const name of [edge.source, edge.target]) {
        if (name && !acc.some((s) => s.id === name)) {
          acc.push({ id: name, label: name, iconType: 'layers' });
        }
      }
      return acc;
    }, []);

    const causeCards = causeKis.map((ki) => ({
      id: `cause-${ki.name}`,
      label: 'Root Cause',
      value: ki.name,
      iconType: 'crosshairs' as const,
    }));

    const exposedEdgeCards = edges
      .filter((edge) => edge.exposure === 'exposed')
      .map((edge) => ({
        id: `exposed-${edge.source}`,
        label: 'Impacted',
        value: edge.source,
        iconType: 'dot' as const,
      }));

    return {
      raw: doc as unknown as LatestSignificantEventData['raw'],
      state: severity.state,
      blastRadiusScore: doc.criticality,
      mainEventTitle: doc.title,
      description: doc.summary,
      impactedServices: edgeDerivedServices as LatestSignificantEventData['impactedServices'],
      impactedCards: [...causeCards, ...exposedEdgeCards],
      severityLabel: severity.label,
      severityColor: severity.color,
      detailFields: {
        id: doc.event_id,
        label: doc.title,
        subtitle: (doc.stream_names ?? []).join(' · '),
        summary: doc.summary,
        rootCause: doc.root_cause ?? '',
        recommendations: Array.isArray(doc.recommendations) ? doc.recommendations : [],
        recommendedAction:
          (doc.recommended_action as 'escalate' | 'monitor' | 'resolve' | 'investigate') ??
          'monitor',
        criticality: doc.criticality,
        ruleNames: doc.rule_names ?? [],
        streamNames: doc.stream_names ?? [],
        evidences: [],
        dependencyEdges: edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          protocol: edge.protocol,
          exposure: edge.exposure as 'exposed' | 'not_exposed',
        })),
        causeKis: causeKis.map((ki) => ({ name: ki.name, streamName: ki.stream_name })),
        timestamp,
      },
      timestamp,
    };
  });
