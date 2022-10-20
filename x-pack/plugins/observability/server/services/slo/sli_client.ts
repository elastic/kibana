/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsSumAggregate } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { assertNever } from '@kbn/std';
import { SLO_DESTINATION_INDEX_NAME } from '../../assets/constants';
import { toDateRange } from '../../domain/services/date_range';
import { InternalQueryError } from '../../errors';
import { Duration, IndicatorData, SLO } from '../../types/models';
import { calendarAlignedTimeWindowSchema, rollingTimeWindowSchema } from '../../types/schema';
import {
  occurencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
} from '../../types/schema';

export interface SLIClient {
  fetchCurrentSLIData(slo: SLO): Promise<IndicatorData>;
}

type AggKey = 'good' | 'total';

export class DefaultSLIClient implements SLIClient {
  constructor(private esClient: ElasticsearchClient) {}

  async fetchCurrentSLIData(slo: SLO): Promise<IndicatorData> {
    if (occurencesBudgetingMethodSchema.is(slo.budgeting_method)) {
      const result = await this.esClient.search<unknown, Record<AggKey, AggregationsSumAggregate>>({
        ...commonQuery(slo),
        aggs: {
          good: { sum: { field: 'slo.numerator' } },
          total: { sum: { field: 'slo.denominator' } },
        },
      });

      return handleResult(result.aggregations);
    }

    if (timeslicesBudgetingMethodSchema.is(slo.budgeting_method)) {
      const result = await this.esClient.search<unknown, Record<AggKey, AggregationsSumAggregate>>({
        ...commonQuery(slo),
        aggs: {
          slices: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: toInterval(slo.objective.timeslice_window),
            },
            aggs: {
              good: { sum: { field: 'slo.numerator' } },
              total: { sum: { field: 'slo.denominator' } },
              good_slice: {
                bucket_script: {
                  buckets_path: {
                    good: 'good',
                    total: 'total',
                  },
                  script: `params.good / params.total >= ${slo.objective.timeslice_target} ? 1 : 0`,
                },
              },
              count_slice: {
                bucket_script: {
                  buckets_path: {},
                  script: '1',
                },
              },
            },
          },
          good: {
            sum_bucket: {
              buckets_path: 'slices>good_slice.value',
            },
          },
          total: {
            sum_bucket: {
              buckets_path: 'slices>count_slice.value',
            },
          },
        },
      });

      return handleResult(result.aggregations);
    }

    assertNever(slo.budgeting_method);
  }
}

function fromSLOTimeWindowToEsRange(slo: SLO): { gte: string; lt: string } {
  if (calendarAlignedTimeWindowSchema.is(slo.time_window)) {
    const dateRange = toDateRange(slo.time_window);

    return {
      gte: `${dateRange.from.toISOString()}`,
      lt: `${dateRange.to.toISOString()}`,
    };
  }

  if (rollingTimeWindowSchema.is(slo.time_window)) {
    return {
      gte: `now-${slo.time_window.duration.value}${slo.time_window.duration.unit}/m`,
      lt: `now/m`,
    };
  }

  assertNever(slo.time_window);
}

function commonQuery(slo: SLO) {
  return {
    size: 0,
    index: `${SLO_DESTINATION_INDEX_NAME}*`,
    query: {
      bool: {
        filter: [
          { term: { 'slo.id': slo.id } },
          { term: { 'slo.revision': slo.revision } },
          { range: { '@timestamp': fromSLOTimeWindowToEsRange(slo) } },
        ],
      },
    },
  };
}

function handleResult(
  aggregations: Record<AggKey, AggregationsSumAggregate> | undefined
): IndicatorData {
  const good = aggregations?.good;
  const total = aggregations?.total;
  if (good === undefined || good.value === null || total === undefined || total.value === null) {
    throw new InternalQueryError('SLI aggregation query');
  }

  return {
    good: good.value,
    total: total.value,
  };
}

function toInterval(duration: Duration | undefined): string {
  if (duration === undefined) return '1m';

  return `${duration.value}${duration.unit}`;
}
