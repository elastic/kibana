/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * 📊 AGGREGATION
 *
 * Core aggregation logic that queries APM indices to collect and aggregate:
 * - Exit spans (service-to-service connections)
 * - Span links (async operation connections)
 *
 * Aggregates by source service + destination resource to create edges.
 */

import type { Logger } from '@kbn/core/server';
import { existsQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { asMutableArray } from '../../../../../common/utils/as_mutable_array';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  AT_TIMESTAMP,
  SPAN_NAME,
  SPAN_LINKS_SPAN_ID,
  OTEL_SPAN_LINKS_SPAN_ID,
  EVENT_OUTCOME,
  TRANSACTION_NAME,
} from '../../../../../common/es_fields/apm';
import type { ServiceMapEdge } from '../core/types';
import { normalizeEmptyToNull } from '../core/utils';

const SAMPLES_PER_EDGE = 3;
const SPAN_LINK_IDS_LIMIT = 128;
const MAX_EXIT_SPANS = 1000; // Composite agg pages through all data
const MAX_SPAN_LINKS = 500;
const YIELD_FREQUENCY_AGGREGATION = 50;

// Circuit breakers for Task Manager resource protection
const MAX_PAGES_PER_CHUNK = 20; // Max composite agg pages per time chunk (prevents runaway queries)

/**
 * Aggregate exit span edges from APM data
 */
export async function aggregateExitSpanEdges({
  apmEventClient,
  start,
  end,
  serviceFilter,
  environment,
  logger,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  serviceFilter?: string[]; // Optional filter for service-scoped aggregation
  environment?: string; // Optional filter for environment-scoped aggregation
  logger: Logger;
}): Promise<ServiceMapEdge[]> {
  const now = new Date().toISOString();
  const edges: ServiceMapEdge[] = [];
  let after: Record<string, string | number> | undefined;
  let pageCount = 0;
  let totalBucketsProcessed = 0;
  let skippedNoSamples = 0;
  let skippedNoSpanIds = 0;
  let skippedNoFirstSample = 0;

  do {
    if (pageCount > 0) {
      await new Promise(setImmediate);
    }
    pageCount++;

    logger.debug(`Executing exit span aggregation query (page ${pageCount})`);

    const response = await apmEventClient.search('get_service_map_workflow_exit_spans', {
      apm: { events: [ProcessorEvent.span, ProcessorEvent.transaction] },
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...existsQuery(SPAN_DESTINATION_SERVICE_RESOURCE),
            ...(serviceFilter ? [{ terms: { [SERVICE_NAME]: serviceFilter } }] : []),
            ...(environment !== undefined && environment !== null && environment !== ''
              ? [{ term: { [SERVICE_ENVIRONMENT]: environment } }]
              : []),
          ],
          must_not: [
            ...(environment === null || environment === ''
              ? [{ exists: { field: SERVICE_ENVIRONMENT } }]
              : []),
          ],
        },
      },
      aggs: {
        edges: {
          composite: {
            size: MAX_EXIT_SPANS,
            ...(after ? { after } : {}),
            sources: asMutableArray([
              { source_service: { terms: { field: SERVICE_NAME } } },
              { destination_resource: { terms: { field: SPAN_DESTINATION_SERVICE_RESOURCE } } },
            ] as const),
          },
          aggs: {
            span_count: { value_count: { field: SPAN_ID } },
            max_timestamp: { max: { field: AT_TIMESTAMP } },
            eventOutcomeGroup: {
              filters: {
                filters: {
                  success: {
                    term: {
                      [EVENT_OUTCOME]: 'success' as const,
                    },
                  },
                  others: {
                    bool: {
                      must_not: {
                        term: {
                          [EVENT_OUTCOME]: 'success' as const,
                        },
                      },
                    },
                  },
                },
              },
              aggs: {
                sample: {
                  top_metrics: {
                    size: SAMPLES_PER_EDGE,
                    sort: { [AT_TIMESTAMP]: 'desc' as const },
                    metrics: asMutableArray([
                      { field: SPAN_ID },
                      { field: SPAN_TYPE },
                      { field: SPAN_SUBTYPE },
                      { field: SERVICE_ENVIRONMENT },
                      { field: AGENT_NAME },
                    ] as const),
                  },
                },
              },
            },
          },
        },
      },
    });

    const buckets = response.aggregations?.edges?.buckets ?? [];
    totalBucketsProcessed += buckets.length;
    logger.debug(`Processing ${buckets.length} buckets from page ${pageCount}`);

    for (let i = 0; i < buckets.length; i++) {
      if (i > 0 && i % YIELD_FREQUENCY_AGGREGATION === 0) {
        await new Promise(setImmediate);
      }

      const bucket = buckets[i];
      const { success, others } = bucket.eventOutcomeGroup.buckets;
      const eventOutcomeGroup =
        success.sample.top.length > 0 ? success : others.sample.top.length > 0 ? others : undefined;

      const samples = eventOutcomeGroup?.sample.top ?? [];

      if (samples.length === 0) {
        skippedNoSamples++;
        continue;
      }

      const sampleSpans = samples
        .map((top) => top.metrics?.[SPAN_ID] as string | undefined)
        .filter((spanId): spanId is string => !!spanId);

      if (sampleSpans.length === 0) {
        skippedNoSpanIds++;
        continue;
      }

      const firstSample = samples[0]?.metrics;
      if (!firstSample) {
        skippedNoFirstSample++;
        continue;
      }

      const maxTimestampAgg = bucket.max_timestamp;
      const maxTimestamp =
        maxTimestampAgg && 'value' in maxTimestampAgg && typeof maxTimestampAgg.value === 'number'
          ? maxTimestampAgg.value
          : undefined;

      const sampleMetrics = firstSample as Record<string, string | number | null>;

      edges.push({
        source_service: bucket.key.source_service as string,
        source_agent: normalizeEmptyToNull(sampleMetrics[AGENT_NAME] as string),
        source_environment: normalizeEmptyToNull(sampleMetrics[SERVICE_ENVIRONMENT] as string),
        destination_resource: bucket.key.destination_resource as string,
        destination_service: null,
        destination_agent: null,
        destination_environment: null,
        span_type: (sampleMetrics[SPAN_TYPE] as string) ?? 'external',
        span_subtype: normalizeEmptyToNull((sampleMetrics[SPAN_SUBTYPE] as string) ?? ''),
        span_count: bucket.span_count.value ?? 0,
        edge_type: 'exit_span',
        sample_spans: sampleSpans,
        computed_at: now,
        max_span_timestamp: maxTimestamp,
      });
    }

    after = response.aggregations?.edges?.after_key;

    // Circuit breaker: prevent excessive pagination in high-cardinality environments
    if (pageCount >= MAX_PAGES_PER_CHUNK) {
      logger.warn(
        `Exit span aggregation reached max pages (${MAX_PAGES_PER_CHUNK}) for time window. ` +
          `This may indicate high cardinality. Consider narrowing time window or adding filters.`
      );
      break;
    }
  } while (after);

  const skippedTotal = skippedNoSamples + skippedNoSpanIds + skippedNoFirstSample;
  logger.info(
    `Aggregated ${edges.length} exit span edges from ${pageCount} pages ` +
      `(${totalBucketsProcessed} total buckets processed, ${skippedTotal} skipped: ` +
      `no samples: ${skippedNoSamples}, no span IDs: ${skippedNoSpanIds}, no first sample: ${skippedNoFirstSample})` +
      (pageCount >= MAX_PAGES_PER_CHUNK ? ` [CIRCUIT BREAKER: max pages reached]` : '')
  );
  return edges;
}

/**
 * Builds the shared span links query filter.
 */
function buildSpanLinksFilter({
  start,
  end,
  serviceFilter,
  environment,
}: {
  start: number;
  end: number;
  serviceFilter?: string[];
  environment?: string;
}) {
  return {
    filter: [
      ...rangeQuery(start, end),
      {
        bool: {
          minimum_should_match: 1,
          should: [...existsQuery(SPAN_LINKS_SPAN_ID), ...existsQuery(OTEL_SPAN_LINKS_SPAN_ID)],
        },
      },
      ...(serviceFilter ? [{ terms: { [SERVICE_NAME]: serviceFilter } }] : []),
      ...(environment !== undefined && environment !== null && environment !== ''
        ? [{ term: { [SERVICE_ENVIRONMENT]: environment } }]
        : []),
    ],
    must_not: [
      ...(environment === null || environment === ''
        ? [{ exists: { field: SERVICE_ENVIRONMENT } }]
        : []),
    ],
  };
}

/**
 * Extracts linked span IDs from bucket sub-aggregations.
 */
function extractLinkedSpanIds(bucket: {
  linked_span_ids?: { buckets: Array<{ key: string | number }> };
  otel_linked_span_ids?: { buckets: Array<{ key: string | number }> };
}): string[] {
  const apmLinkedIds = (bucket.linked_span_ids?.buckets ?? []).map((b) => String(b.key));
  const otelLinkedIds = (bucket.otel_linked_span_ids?.buckets ?? []).map((b) => String(b.key));
  return [...new Set([...apmLinkedIds, ...otelLinkedIds])];
}

/**
 * Aggregate outgoing span link edges from APM data.
 *
 * Outgoing span links: SPANS that have span.links pointing to other spans.
 * Groups by (SERVICE_NAME, SPAN_NAME). The linked span IDs are stored as
 * sample_spans so resolution can look up the destination service.
 *
 * Direction: source_service (linking span's service) → destination_service (linked span's service)
 */
async function aggregateOutgoingSpanLinkEdges({
  apmEventClient,
  start,
  end,
  serviceFilter,
  environment,
  logger,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  serviceFilter?: string[];
  environment?: string;
  logger: Logger;
}): Promise<ServiceMapEdge[]> {
  const now = new Date().toISOString();
  const edges: ServiceMapEdge[] = [];
  let after: Record<string, string | number> | undefined;
  let pageCount = 0;

  do {
    if (pageCount > 0) {
      await new Promise(setImmediate);
    }
    pageCount++;

    logger.debug(`Executing outgoing span link aggregation query (page ${pageCount})`);

    const response = await apmEventClient.search('get_service_map_workflow_outgoing_span_links', {
      apm: { events: [ProcessorEvent.span] },
      track_total_hits: false,
      size: 0,
      query: {
        bool: buildSpanLinksFilter({ start, end, serviceFilter, environment }),
      },
      aggs: {
        span_links: {
          composite: {
            size: MAX_SPAN_LINKS,
            ...(after ? { after } : {}),
            sources: asMutableArray([
              { source_service: { terms: { field: SERVICE_NAME } } },
              { span_name: { terms: { field: SPAN_NAME } } },
            ] as const),
          },
          aggs: {
            span_count: { value_count: { field: SPAN_ID } },
            max_timestamp: { max: { field: AT_TIMESTAMP } },
            linked_span_ids: {
              terms: { field: SPAN_LINKS_SPAN_ID, size: SPAN_LINK_IDS_LIMIT },
            },
            otel_linked_span_ids: {
              terms: { field: OTEL_SPAN_LINKS_SPAN_ID, size: SPAN_LINK_IDS_LIMIT },
            },
            sample: {
              top_metrics: {
                size: 1,
                sort: { [AT_TIMESTAMP]: 'desc' as const },
                metrics: asMutableArray([
                  { field: SPAN_TYPE },
                  { field: SPAN_SUBTYPE },
                  { field: SERVICE_ENVIRONMENT },
                  { field: AGENT_NAME },
                ] as const),
              },
            },
          },
        },
      },
    });

    const buckets = response.aggregations?.span_links.buckets ?? [];
    logger.debug(`Processing ${buckets.length} outgoing span link buckets from page ${pageCount}`);

    for (let i = 0; i < buckets.length; i++) {
      if (i > 0 && i % YIELD_FREQUENCY_AGGREGATION === 0) {
        await new Promise(setImmediate);
      }

      const bucket = buckets[i];
      const allLinkedIds = extractLinkedSpanIds(bucket);
      if (allLinkedIds.length === 0) continue;

      const sample = bucket.sample?.top[0]?.metrics;
      if (!sample) continue;

      const maxTimestampAgg = bucket.max_timestamp;
      const maxTimestamp =
        maxTimestampAgg && 'value' in maxTimestampAgg && typeof maxTimestampAgg.value === 'number'
          ? maxTimestampAgg.value
          : undefined;

      const sampleMetrics = sample as Record<string, string | number | null>;

      edges.push({
        source_service: bucket.key.source_service as string,
        source_agent: normalizeEmptyToNull((sampleMetrics[AGENT_NAME] as string) ?? ''),
        source_environment: normalizeEmptyToNull(
          (sampleMetrics[SERVICE_ENVIRONMENT] as string) ?? ''
        ),
        destination_resource: bucket.key.span_name as string,
        destination_service: null,
        destination_agent: null,
        destination_environment: null,
        span_type: (sampleMetrics[SPAN_TYPE] as string) ?? 'messaging',
        span_subtype: normalizeEmptyToNull((sampleMetrics[SPAN_SUBTYPE] as string) ?? ''),
        span_count: bucket.span_count.value ?? 0,
        edge_type: 'span_link',
        sample_spans: allLinkedIds.slice(0, SPAN_LINK_IDS_LIMIT),
        computed_at: now,
        max_span_timestamp: maxTimestamp,
      });
    }

    after = response.aggregations?.span_links.after_key;

    if (pageCount >= MAX_PAGES_PER_CHUNK) {
      logger.warn(`Outgoing span link aggregation reached max pages (${MAX_PAGES_PER_CHUNK}).`);
      break;
    }
  } while (after);

  logger.info(
    `Aggregated ${edges.length} outgoing span link edges from ${pageCount} pages` +
      (pageCount >= MAX_PAGES_PER_CHUNK ? ` [CIRCUIT BREAKER]` : '')
  );
  return edges;
}

/**
 * Aggregate incoming span link edges from APM data.
 *
 * Incoming span links: TRANSACTIONS that have span.links pointing to producer spans.
 * Groups by (SERVICE_NAME, TRANSACTION_NAME). The linked span IDs are stored as
 * sample_spans so resolution can look up the source (producer) service.
 *
 * Direction is inverted: the transaction's service is the consumer (destination),
 * and the linked span's service is the producer (source).
 * edge_type = 'span_link_incoming' signals resolution to swap source ↔ destination.
 */
async function aggregateIncomingSpanLinkEdges({
  apmEventClient,
  start,
  end,
  serviceFilter,
  environment,
  logger,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  serviceFilter?: string[];
  environment?: string;
  logger: Logger;
}): Promise<ServiceMapEdge[]> {
  const now = new Date().toISOString();
  const edges: ServiceMapEdge[] = [];
  let after: Record<string, string | number> | undefined;
  let pageCount = 0;

  do {
    if (pageCount > 0) {
      await new Promise(setImmediate);
    }
    pageCount++;

    logger.debug(`Executing incoming span link aggregation query (page ${pageCount})`);

    const response = await apmEventClient.search('get_service_map_workflow_incoming_span_links', {
      apm: { events: [ProcessorEvent.transaction] },
      track_total_hits: false,
      size: 0,
      query: {
        bool: buildSpanLinksFilter({ start, end, serviceFilter, environment }),
      },
      aggs: {
        span_links: {
          composite: {
            size: MAX_SPAN_LINKS,
            ...(after ? { after } : {}),
            sources: asMutableArray([
              { source_service: { terms: { field: SERVICE_NAME } } },
              { transaction_name: { terms: { field: TRANSACTION_NAME } } },
            ] as const),
          },
          aggs: {
            span_count: { value_count: { field: SPAN_ID } },
            max_timestamp: { max: { field: AT_TIMESTAMP } },
            linked_span_ids: {
              terms: { field: SPAN_LINKS_SPAN_ID, size: SPAN_LINK_IDS_LIMIT },
            },
            otel_linked_span_ids: {
              terms: { field: OTEL_SPAN_LINKS_SPAN_ID, size: SPAN_LINK_IDS_LIMIT },
            },
            sample: {
              top_metrics: {
                size: 1,
                sort: { [AT_TIMESTAMP]: 'desc' as const },
                metrics: asMutableArray([
                  { field: SERVICE_ENVIRONMENT },
                  { field: AGENT_NAME },
                ] as const),
              },
            },
          },
        },
      },
    });

    const buckets = response.aggregations?.span_links.buckets ?? [];
    logger.debug(`Processing ${buckets.length} incoming span link buckets from page ${pageCount}`);

    for (let i = 0; i < buckets.length; i++) {
      if (i > 0 && i % YIELD_FREQUENCY_AGGREGATION === 0) {
        await new Promise(setImmediate);
      }

      const bucket = buckets[i];
      const allLinkedIds = extractLinkedSpanIds(bucket);
      if (allLinkedIds.length === 0) continue;

      const sample = bucket.sample?.top[0]?.metrics;
      if (!sample) continue;

      const maxTimestampAgg = bucket.max_timestamp;
      const maxTimestamp =
        maxTimestampAgg && 'value' in maxTimestampAgg && typeof maxTimestampAgg.value === 'number'
          ? maxTimestampAgg.value
          : undefined;

      const sampleMetrics = sample as Record<string, string | number | null>;

      // For incoming links, source_service is the consumer (transaction's service).
      // After resolution, destination_service will be set to the producer.
      // The materialization step handles the direction swap for 'span_link_incoming'.
      edges.push({
        source_service: bucket.key.source_service as string,
        source_agent: normalizeEmptyToNull((sampleMetrics[AGENT_NAME] as string) ?? ''),
        source_environment: normalizeEmptyToNull(
          (sampleMetrics[SERVICE_ENVIRONMENT] as string) ?? ''
        ),
        destination_resource: bucket.key.transaction_name as string,
        destination_service: null,
        destination_agent: null,
        destination_environment: null,
        span_type: 'messaging',
        span_subtype: null,
        span_count: bucket.span_count.value ?? 0,
        edge_type: 'span_link_incoming',
        sample_spans: allLinkedIds.slice(0, SPAN_LINK_IDS_LIMIT),
        computed_at: now,
        max_span_timestamp: maxTimestamp,
      });
    }

    after = response.aggregations?.span_links.after_key;

    if (pageCount >= MAX_PAGES_PER_CHUNK) {
      logger.warn(`Incoming span link aggregation reached max pages (${MAX_PAGES_PER_CHUNK}).`);
      break;
    }
  } while (after);

  logger.info(
    `Aggregated ${edges.length} incoming span link edges from ${pageCount} pages` +
      (pageCount >= MAX_PAGES_PER_CHUNK ? ` [CIRCUIT BREAKER]` : '')
  );
  return edges;
}

/**
 * Aggregate span link edges from APM data.
 *
 * Runs two aggregations following the pattern in fetch_exit_span_samples.ts:
 * 1. Outgoing: spans with span.links → groups by (service_name, span.name)
 * 2. Incoming: transactions with span.links → groups by (service_name, transaction.name)
 *
 * Both store the LINKED span IDs as sample_spans for resolution.
 */
export async function aggregateSpanLinkEdges({
  apmEventClient,
  start,
  end,
  serviceFilter,
  environment,
  logger,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  serviceFilter?: string[];
  environment?: string;
  logger: Logger;
}): Promise<ServiceMapEdge[]> {
  const [outgoing, incoming] = await Promise.all([
    aggregateOutgoingSpanLinkEdges({
      apmEventClient,
      start,
      end,
      serviceFilter,
      environment,
      logger,
    }),
    aggregateIncomingSpanLinkEdges({
      apmEventClient,
      start,
      end,
      serviceFilter,
      environment,
      logger,
    }),
  ]);

  logger.info(
    `Total span link edges: ${outgoing.length} outgoing + ${incoming.length} incoming = ${
      outgoing.length + incoming.length
    }`
  );

  return [...outgoing, ...incoming];
}
