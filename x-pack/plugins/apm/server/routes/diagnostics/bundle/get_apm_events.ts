/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { merge } from 'lodash';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import {
  PROCESSOR_EVENT,
  METRICSET_NAME,
  METRICSET_INTERVAL,
  TRANSACTION_DURATION_SUMMARY,
  INDEX,
} from '../../../../common/es_fields/apm';
import { getTypedSearch, TypedSearch } from '../create_typed_es_client';
import { getApmIndexPatterns } from './get_indices';

export interface ApmEvent {
  legacy?: boolean;
  name: string;
  kuery: string;
  index: string[];
  docCount: number;
  intervals?: Record<string, { metricDocCount: number; eventDocCount: number }>;
}

export async function getApmEvents({
  esClient,
  apmIndices,
  start,
  end,
  kuery,
}: {
  esClient: ElasticsearchClient;
  apmIndices: APMIndices;
  start: number;
  end: number;
  kuery?: string;
}): Promise<ApmEvent[]> {
  const typedSearch = getTypedSearch(esClient);

  const commonProps = { start, end, typedSearch };
  const items = await Promise.all([
    getEventWithMetricsetInterval({
      ...commonProps,
      name: 'Metric: Service destination',
      index: getApmIndexPatterns([apmIndices.metric]),
      kuery: mergeKueries(
        `${PROCESSOR_EVENT}: "metric" AND ${METRICSET_NAME}: "service_destination"`,
        kuery
      ),
    }),
    getEventWithMetricsetInterval({
      ...commonProps,
      name: 'Metric: Service transaction (8.7+)',
      index: getApmIndexPatterns([apmIndices.metric]),
      kuery: mergeKueries(
        `${PROCESSOR_EVENT}: "metric" AND ${METRICSET_NAME}: "service_transaction" AND ${TRANSACTION_DURATION_SUMMARY} :* `,
        kuery
      ),
    }),
    getEventWithMetricsetInterval({
      ...commonProps,
      name: 'Metric: Transaction (8.7+)',
      index: getApmIndexPatterns([apmIndices.metric]),
      kuery: mergeKueries(
        `${PROCESSOR_EVENT}: "metric" AND ${METRICSET_NAME}: "transaction" AND ${TRANSACTION_DURATION_SUMMARY} :* `,
        kuery
      ),
    }),
    getEventWithMetricsetInterval({
      ...commonProps,
      legacy: true,
      name: 'Metric: Service transaction (pre-8.7)',
      index: getApmIndexPatterns([apmIndices.metric]),
      kuery: mergeKueries(
        `${PROCESSOR_EVENT}: "metric" AND ${METRICSET_NAME}: "service_transaction" AND not ${TRANSACTION_DURATION_SUMMARY} :* `,
        kuery
      ),
    }),
    getEventWithMetricsetInterval({
      ...commonProps,
      legacy: true,
      name: 'Metric: Transaction (pre-8.7)',
      index: getApmIndexPatterns([apmIndices.metric]),
      kuery: mergeKueries(
        `${PROCESSOR_EVENT}: "metric" AND ${METRICSET_NAME}: "transaction" AND not ${TRANSACTION_DURATION_SUMMARY} :* `,
        kuery
      ),
    }),
    getEventWithMetricsetInterval({
      ...commonProps,
      name: 'Metric: Service summary',
      index: getApmIndexPatterns([apmIndices.metric]),
      kuery: mergeKueries(
        `${PROCESSOR_EVENT}: "metric" AND ${METRICSET_NAME}: "service_summary"`,
        kuery
      ),
    }),
    getEvent({
      ...commonProps,
      name: 'Metric: Span breakdown',
      index: getApmIndexPatterns([apmIndices.metric]),
      kuery: mergeKueries(
        `${PROCESSOR_EVENT}: "metric" AND ${METRICSET_NAME}: "span_breakdown"`,
        kuery
      ),
    }),
    getEvent({
      ...commonProps,
      name: 'Event: Transaction',
      index: getApmIndexPatterns([apmIndices.transaction]),
      kuery: mergeKueries(`${PROCESSOR_EVENT}: "transaction"`, kuery),
    }),
    getEvent({
      ...commonProps,
      name: 'Event: Span',
      index: getApmIndexPatterns([apmIndices.span]),
      kuery: mergeKueries(`${PROCESSOR_EVENT}: "span"`, kuery),
    }),
    getEvent({
      ...commonProps,
      name: 'Event: Error',
      index: getApmIndexPatterns([apmIndices.error]),
      kuery: mergeKueries(`${PROCESSOR_EVENT}: "error"`, kuery),
    }),
  ]);

  return items;
}

async function getEventWithMetricsetInterval({
  legacy,
  name,
  index,
  start,
  end,
  kuery,
  typedSearch,
}: {
  legacy?: boolean;
  name: string;
  index: string[];
  start: number;
  end: number;
  kuery: string;
  typedSearch: TypedSearch;
}) {
  const res = await typedSearch({
    expand_wildcards: 'all',
    track_total_hits: true,
    index,
    size: 0,
    query: {
      bool: {
        filter: [...kqlQuery(kuery), ...rangeQuery(start, end)],
      },
    },
    aggs: {
      metricset_intervals: {
        terms: {
          size: 1000,
          field: METRICSET_INTERVAL,
        },
        aggs: {
          metric_doc_count: {
            value_count: {
              field: INDEX,
            },
          },
        },
      },
    },
  });

  const defaultIntervals = {
    '1m': { metricDocCount: 0, eventDocCount: 0 },
    '10m': { metricDocCount: 0, eventDocCount: 0 },
    '60m': { metricDocCount: 0, eventDocCount: 0 },
  };
  const foundIntervals = res.aggregations?.metricset_intervals.buckets.reduce<
    Record<string, { metricDocCount: number; eventDocCount: number }>
  >((acc, item) => {
    acc[item.key] = {
      metricDocCount: item.metric_doc_count.value,
      eventDocCount: item.doc_count,
    };
    return acc;
  }, {});

  const intervals = merge(defaultIntervals, foundIntervals);
  return {
    legacy,
    name,
    kuery,
    index,
    docCount: res.hits.total.value,
    intervals,
  };
}

async function getEvent({
  name,
  index,
  start,
  end,
  kuery,
  typedSearch,
}: {
  name: string;
  index: string[];
  start: number;
  end: number;
  kuery: string;
  typedSearch: TypedSearch;
}) {
  const res = await typedSearch({
    track_total_hits: true,
    index,
    size: 0,
    query: {
      bool: {
        filter: [...kqlQuery(kuery), ...rangeQuery(start, end)],
      },
    },
  });

  return {
    name,
    kuery,
    index,
    docCount: res.hits.total.value,
  };
}

function mergeKueries(fixedKuery: string, kuery?: string) {
  if (!kuery) {
    return fixedKuery;
  }

  return `(${fixedKuery}) AND (${kuery})`;
}
