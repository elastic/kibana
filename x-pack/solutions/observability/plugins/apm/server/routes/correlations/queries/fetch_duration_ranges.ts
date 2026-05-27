/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { sumBy } from 'lodash';
import type { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
import { getCommonCorrelationsQuery } from './get_common_correlations_query';
import type { Environment } from '../../../../common/environment_rt';
import type { EntityType } from '../../../../common/correlations/types';
import {
  getDurationField,
  getDurationFieldFromEntityType,
  getEventType,
  getEventTypeFromEntityType,
} from '../utils';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getBackwardCompatibleDocumentTypeFilter } from '../../../lib/helpers/transactions';

export const fetchDurationRanges = async ({
  rangeSteps,
  apmEventClient,
  start,
  end,
  environment,
  kuery,
  query,
  chartType,
  entityType,
  searchMetrics = false,
  isOtel = false,
}: {
  rangeSteps: number[];
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  environment: Environment;
  kuery: string;
  query: estypes.QueryDslQueryContainer;
  chartType?: LatencyDistributionChartType;
  entityType?: EntityType;
  searchMetrics?: boolean;
  isOtel?: boolean;
}): Promise<{
  totalDocCount: number;
  durationRanges: Array<{ key: number; doc_count: number }>;
}> => {
  const useEntityType = entityType !== undefined;
  // when using metrics data, ensure we filter by docs with the appropriate duration field
  const filteredQuery =
    !useEntityType && searchMetrics
      ? {
          bool: {
            filter: [query, ...getBackwardCompatibleDocumentTypeFilter(true)],
          },
        }
      : query;

  const eventType = useEntityType
    ? getEventTypeFromEntityType(entityType)
    : getEventType(chartType!, searchMetrics);
  const durationField = useEntityType
    ? getDurationFieldFromEntityType(entityType, isOtel)
    : getDurationField(chartType!, searchMetrics, isOtel);

  const ranges = rangeSteps.reduce(
    (p, to) => {
      const from = p[p.length - 1].to;
      p.push({ from, to });
      return p;
    },
    [{ to: 0 }] as Array<{ from?: number; to?: number }>
  );
  if (ranges.length > 0) {
    ranges.push({ from: ranges[ranges.length - 1].to });
  }

  const resp = await apmEventClient.search(
    'get_duration_ranges',
    {
      apm: {
        events: [eventType],
      },
      track_total_hits: false,
      size: 0,
      query: getCommonCorrelationsQuery({
        start,
        end,
        environment,
        kuery,
        query: filteredQuery,
      }),
      aggs: {
        logspace_ranges: {
          range: {
            field: durationField,
            ranges,
          },
        },
      },
    },
    { skipProcessorEventFilter: isOtel }
  );

  const durationRanges =
    resp.aggregations?.logspace_ranges.buckets
      .map((d) => ({
        key: d.from,
        doc_count: d.doc_count,
      }))
      .filter((d): d is { key: number; doc_count: number } => d.key !== undefined) ?? [];

  return {
    totalDocCount: sumBy(durationRanges, 'doc_count'),
    durationRanges,
  };
};
