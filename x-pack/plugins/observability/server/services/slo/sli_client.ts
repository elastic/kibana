/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsAggregationContainer,
  AggregationsDateRangeAggregate,
  AggregationsSumAggregate,
  MsearchMultisearchBody,
  MsearchResponseItem,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import { assertNever } from '@kbn/std';
import { occurrencesBudgetingMethodSchema, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';
import { SLO_DESTINATION_INDEX_NAME } from '../../assets/constants';
import { toDateRange } from '../../domain/services/date_range';
import { InternalQueryError } from '../../errors';
import { DateRange, Duration, IndicatorData, SLO, SLOId } from '../../domain/models';

export interface SLIClient {
  fetchCurrentSLIData(sloList: SLO[]): Promise<Record<SLOId, IndicatorData>>;
  fetchSLIDataFrom(
    slo: SLO,
    lookbackWindows: LookbackWindow[]
  ): Promise<Record<WindowName, IndicatorData>>;
}

type WindowName = string;

interface LookbackWindow {
  name: WindowName;
  duration: Duration;
}

type AggKey = 'good' | 'total';
type EsAggregations = Record<WindowName, AggregationsDateRangeAggregate>;

export class DefaultSLIClient implements SLIClient {
  constructor(private esClient: ElasticsearchClient) {}

  async fetchCurrentSLIData(sloList: SLO[]): Promise<Record<SLOId, IndicatorData>> {
    const dateRangeBySlo: Record<SLOId, DateRange> = sloList.reduce(
      (acc, slo) => ({ [slo.id]: toDateRange(slo.timeWindow), ...acc }),
      {}
    );
    const searches = sloList.flatMap((slo) => [
      { index: `${SLO_DESTINATION_INDEX_NAME}*` },
      generateSearchQuery(slo, dateRangeBySlo[slo.id]),
    ]);

    const indicatorDataBySlo: Record<SLOId, IndicatorData> = {};
    if (searches.length === 0) {
      return indicatorDataBySlo;
    }

    const result = await this.esClient.msearch<unknown, Record<AggKey, AggregationsSumAggregate>>({
      searches,
    });

    for (let i = 0; i < result.responses.length; i++) {
      const slo = sloList[i];
      if ('error' in result.responses[i]) {
        // handle errorneous responses with default zero values, and keep going
        indicatorDataBySlo[slo.id] = { dateRange: dateRangeBySlo[slo.id], good: 0, total: 0 };
        continue;
      }

      indicatorDataBySlo[slo.id] = handleResult(dateRangeBySlo[slo.id], result.responses[i]);
    }

    return indicatorDataBySlo;
  }

  async fetchSLIDataFrom(
    slo: SLO,
    lookbackWindows: LookbackWindow[]
  ): Promise<Record<WindowName, IndicatorData>> {
    const sortedLookbackWindows = [...lookbackWindows].sort((a, b) =>
      a.duration.isShorterThan(b.duration) ? 1 : -1
    );
    const longestLookbackWindow = sortedLookbackWindows[0];
    const longestDateRange = toDateRange({
      duration: longestLookbackWindow.duration,
      isRolling: true,
    });

    if (occurrencesBudgetingMethodSchema.is(slo.budgetingMethod)) {
      const result = await this.esClient.search<unknown, EsAggregations>({
        ...commonQuery(slo, longestDateRange),
        index: `${SLO_DESTINATION_INDEX_NAME}*`,
        aggs: toLookbackWindowsAggregationsQuery(sortedLookbackWindows),
      });

      return handleWindowedResult(result.aggregations, lookbackWindows);
    }

    if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
      const result = await this.esClient.search<unknown, EsAggregations>({
        ...commonQuery(slo, longestDateRange),
        index: `${SLO_DESTINATION_INDEX_NAME}*`,
        aggs: toLookbackWindowsSlicedAggregationsQuery(slo, sortedLookbackWindows),
      });

      return handleWindowedResult(result.aggregations, lookbackWindows);
    }

    assertNever(slo.budgetingMethod);
  }
}

function generateSearchQuery(slo: SLO, dateRange: DateRange): MsearchMultisearchBody {
  if (occurrencesBudgetingMethodSchema.is(slo.budgetingMethod)) {
    return {
      ...commonQuery(slo, dateRange),
      aggs: {
        good: { sum: { field: 'slo.numerator' } },
        total: { sum: { field: 'slo.denominator' } },
      },
    };
  }

  if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
    return {
      ...commonQuery(slo, dateRange),
      aggs: {
        slices: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: toInterval(slo.objective.timesliceWindow),
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
                script: `params.good / params.total >= ${slo.objective.timesliceTarget} ? 1 : 0`,
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
    };
  }

  assertNever(slo.budgetingMethod);
}

function commonQuery(
  slo: SLO,
  dateRange: DateRange
): Pick<MsearchMultisearchBody, 'size' | 'query'> {
  return {
    size: 0,
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

function handleResult(dateRange: DateRange, response: MsearchResponseItem): IndicatorData {
  // @ts-ignore
  const { aggregations } = response;
  const good = aggregations?.good;
  const total = aggregations?.total;
  if (good === undefined || good.value === null || total === undefined || total.value === null) {
    throw new InternalQueryError('SLI aggregation query');
  }

  return {
    dateRange,
    good: good.value,
    total: total.value,
  };
}

function toLookbackWindowsAggregationsQuery(sortedLookbackWindow: LookbackWindow[]) {
  return sortedLookbackWindow.reduce<Record<string, AggregationsAggregationContainer>>(
    (acc, lookbackWindow) => ({
      ...acc,
      [lookbackWindow.name]: {
        date_range: {
          field: '@timestamp',
          ranges: [{ from: `now-${lookbackWindow.duration.format()}/m`, to: 'now/m' }],
        },
        aggs: {
          good: { sum: { field: 'slo.numerator' } },
          total: { sum: { field: 'slo.denominator' } },
        },
      },
    }),
    {}
  );
}

function toLookbackWindowsSlicedAggregationsQuery(slo: SLO, lookbackWindows: LookbackWindow[]) {
  return lookbackWindows.reduce<Record<string, AggregationsAggregationContainer>>(
    (acc, lookbackWindow) => ({
      ...acc,
      [lookbackWindow.name]: {
        date_range: {
          field: '@timestamp',
          ranges: [
            {
              from: `now-${lookbackWindow.duration.format()}/m`,
              to: 'now/m',
            },
          ],
        },
        aggs: {
          slices: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: toInterval(slo.objective.timesliceWindow),
            },
            aggs: {
              good: {
                sum: {
                  field: 'slo.numerator',
                },
              },
              total: {
                sum: {
                  field: 'slo.denominator',
                },
              },
              good_slice: {
                bucket_script: {
                  buckets_path: {
                    good: 'good',
                    total: 'total',
                  },
                  script: `params.good / params.total >= ${slo.objective.timesliceTarget} ? 1 : 0`,
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
      },
    }),
    {}
  );
}

function handleWindowedResult(
  aggregations: Record<WindowName, AggregationsDateRangeAggregate> | undefined,
  lookbackWindows: LookbackWindow[]
): Record<WindowName, IndicatorData> {
  if (aggregations === undefined) {
    throw new InternalQueryError('Invalid aggregation response');
  }

  const indicatorDataPerLookbackWindow: Record<WindowName, IndicatorData> = {};
  lookbackWindows.forEach((lookbackWindow) => {
    const windowAggBuckets = aggregations[lookbackWindow.name]?.buckets;
    if (!Array.isArray(windowAggBuckets) || windowAggBuckets.length === 0) {
      throw new InternalQueryError('Invalid aggregation bucket response');
    }
    const bucket = windowAggBuckets[0];
    const good = (bucket.good as AggregationsSumAggregate).value;
    const total = (bucket.total as AggregationsSumAggregate).value;
    if (good === null || total === null) {
      throw new InternalQueryError('Invalid aggregation sum bucket response');
    }

    indicatorDataPerLookbackWindow[lookbackWindow.name] = {
      good,
      total,
      dateRange: { from: new Date(bucket.from_as_string!), to: new Date(bucket.to_as_string!) },
    };
  });

  return indicatorDataPerLookbackWindow;
}

function toInterval(duration: Duration | undefined): string {
  if (duration === undefined) return '1m';

  return duration.format();
}
