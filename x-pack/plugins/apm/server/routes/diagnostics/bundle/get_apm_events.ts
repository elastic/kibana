/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import {
  PROCESSOR_EVENT,
  METRICSET_NAME,
  METRICSET_INTERVAL,
  TRANSACTION_DURATION_SUMMARY,
} from '../../../../common/es_fields/apm';
import { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';
import { getTypedSearch, TypedSearch } from '../create_typed_es_client';
import { getApmIndexPatterns } from './get_indices';

export interface ApmEvent {
  name: string;
  kuery: string;
  index: string[];
  docCount: number;
  intervals?: Record<string, number>;
}

export async function getApmEvents({
  esClient,
  apmIndices,
  start,
  end,
  kuery,
}: {
  esClient: ElasticsearchClient;
  apmIndices: ApmIndicesConfig;
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
      name: 'Metric: Service transaction (with summary field)',
      index: getApmIndexPatterns([apmIndices.metric]),
      kuery: mergeKueries(
        `${PROCESSOR_EVENT}: "metric" AND ${METRICSET_NAME}: "service_transaction" AND ${TRANSACTION_DURATION_SUMMARY} :* `,
        kuery
      ),
    }),
    getEventWithMetricsetInterval({
      ...commonProps,
      name: 'Metric: Transaction (with summary field)',
      index: getApmIndexPatterns([apmIndices.metric]),
      kuery: mergeKueries(
        `${PROCESSOR_EVENT}: "metric" AND ${METRICSET_NAME}: "transaction" AND ${TRANSACTION_DURATION_SUMMARY} :* `,
        kuery
      ),
    }),
    getEventWithMetricsetInterval({
      ...commonProps,
      name: 'Metric: Service transaction (without summary field)',
      index: getApmIndexPatterns([apmIndices.metric]),
      kuery: mergeKueries(
        `${PROCESSOR_EVENT}: "metric" AND ${METRICSET_NAME}: "service_transaction" AND not ${TRANSACTION_DURATION_SUMMARY} :* `,
        kuery
      ),
    }),
    getEventWithMetricsetInterval({
      ...commonProps,
      name: 'Metric: Transaction (without summary field)',
      index: getApmIndexPatterns([apmIndices.metric]),
      kuery: mergeKueries(
        `${PROCESSOR_EVENT}: "metric" AND ${METRICSET_NAME}: "transaction" AND not ${TRANSACTION_DURATION_SUMMARY} :* `,
        kuery
      ),
    }),
    getEventWithMetricsetInterval({
      ...commonProps,
      name: 'Metric: Span breakdown',
      index: getApmIndexPatterns([apmIndices.metric]),
      kuery: mergeKueries(
        `${PROCESSOR_EVENT}: "metric" AND ${METRICSET_NAME}: "span_breakdown"`,
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
      },
    },
  });

  return {
    name,
    kuery,
    index,
    docCount: res.hits.total.value,
    intervals: res.aggregations?.metricset_intervals.buckets.reduce<
      Record<string, number>
    >((acc, item) => {
      acc[item.key] = item.doc_count;
      return acc;
    }, {}),
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
