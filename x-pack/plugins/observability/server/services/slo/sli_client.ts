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
import { DateRange, Duration, IndicatorData, SLO } from '../../types/models';
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
    const dateRange = toDateRange(slo.time_window);
    if (occurencesBudgetingMethodSchema.is(slo.budgeting_method)) {
      const result = await this.esClient.search<unknown, Record<AggKey, AggregationsSumAggregate>>({
        ...commonQuery(slo, dateRange),
        aggs: {
          good: { sum: { field: 'slo.numerator' } },
          total: { sum: { field: 'slo.denominator' } },
        },
      });

      return handleResult(result.aggregations, dateRange);
    }

    if (timeslicesBudgetingMethodSchema.is(slo.budgeting_method)) {
      const result = await this.esClient.search<unknown, Record<AggKey, AggregationsSumAggregate>>({
        ...commonQuery(slo, dateRange),
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

      return handleResult(result.aggregations, dateRange);
    }

    assertNever(slo.budgeting_method);
  }
}

function commonQuery(slo: SLO, dateRange: DateRange) {
  return {
    size: 0,
    index: `${SLO_DESTINATION_INDEX_NAME}*`,
    query: {
      bool: {
        filter: [
          { term: { 'slo.id': slo.id } },
          { term: { 'slo.revision': slo.revision } },
          {
            range: {
              '@timestamp': { gte: dateRange.from.toISOString(), lt: dateRange.to.toISOString() },
            },
          },
        ],
      },
    },
  };
}

function handleResult(
  aggregations: Record<AggKey, AggregationsSumAggregate> | undefined,
  dateRange: DateRange
): IndicatorData {
  const good = aggregations?.good;
  const total = aggregations?.total;
  if (good === undefined || good.value === null || total === undefined || total.value === null) {
    throw new InternalQueryError('SLI aggregation query');
  }

  return {
    date_range: dateRange,
    good: good.value,
    total: total.value,
  };
}

function toInterval(duration: Duration | undefined): string {
  if (duration === undefined) return '1m';

  return `${duration.value}${duration.unit}`;
}
