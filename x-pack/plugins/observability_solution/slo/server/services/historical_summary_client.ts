/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MsearchMultisearchBody } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  ALL_VALUE,
  calendarAlignedTimeWindowSchema,
  Duration,
  fetchHistoricalSummaryResponseSchema,
  occurrencesBudgetingMethodSchema,
  rollingTimeWindowSchema,
  timeslicesBudgetingMethodSchema,
  toMomentUnitOfTime,
} from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import * as t from 'io-ts';
import moment from 'moment';
import { SLO_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { DateRange, HistoricalSummary, SLO, SLOId } from '../domain/models';
import { computeSLI, computeSummaryStatus, toDateRange, toErrorBudget } from '../domain/services';

interface DailyAggBucket {
  key_as_string: string;
  key: number;
  doc_count: number;
  total: {
    value: number;
  };
  good: {
    value: number;
  };
  cumulative_good?: {
    value: number;
  };
  cumulative_total?: {
    value: number;
  };
}

export interface SLOWithInstanceId {
  sloId: SLOId;
  instanceId: string;
  slo: SLO;
}

export type HistoricalSummaryResponse = t.TypeOf<typeof fetchHistoricalSummaryResponseSchema>;

export interface HistoricalSummaryClient {
  fetch(list: SLOWithInstanceId[]): Promise<HistoricalSummaryResponse>;
}

export class DefaultHistoricalSummaryClient implements HistoricalSummaryClient {
  constructor(private esClient: ElasticsearchClient) {}

  async fetch(list: SLOWithInstanceId[]): Promise<HistoricalSummaryResponse> {
    const dateRangeBySlo = list.reduce<Record<SLOId, DateRange>>((acc, { sloId, slo }) => {
      acc[sloId] = getDateRange(slo);
      return acc;
    }, {});

    const searches = list.flatMap(({ sloId, instanceId, slo }) => [
      { index: SLO_DESTINATION_INDEX_PATTERN },
      generateSearchQuery(slo, instanceId, dateRangeBySlo[sloId]),
    ]);

    const historicalSummary: HistoricalSummaryResponse = [];
    if (searches.length === 0) {
      return historicalSummary;
    }

    const result = await this.esClient.msearch({ searches });

    for (let i = 0; i < result.responses.length; i++) {
      const { slo, sloId, instanceId } = list[i];
      if ('error' in result.responses[i]) {
        // handle errorneous responses with an empty historical summary data
        historicalSummary.push({ sloId, instanceId, data: [] });
        continue;
      }

      // @ts-ignore typing msearch is hard, we cast the response to what it is supposed to be.
      const buckets = (result.responses[i].aggregations?.daily?.buckets as DailyAggBucket[]) || [];

      if (rollingTimeWindowSchema.is(slo.timeWindow)) {
        historicalSummary.push({
          sloId,
          instanceId,
          data: handleResultForRolling(slo, buckets),
        });
        continue;
      }

      if (calendarAlignedTimeWindowSchema.is(slo.timeWindow)) {
        if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
          const dateRange = dateRangeBySlo[sloId];
          historicalSummary.push({
            sloId,
            instanceId,
            data: handleResultForCalendarAlignedAndTimeslices(slo, buckets, dateRange),
          });

          continue;
        }

        if (occurrencesBudgetingMethodSchema.is(slo.budgetingMethod)) {
          historicalSummary.push({
            sloId,
            instanceId,
            data: handleResultForCalendarAlignedAndOccurrences(slo, buckets),
          });
          continue;
        }

        assertNever(slo.budgetingMethod);
      }

      assertNever(slo.timeWindow);
    }

    return historicalSummary;
  }
}

function handleResultForCalendarAlignedAndOccurrences(
  slo: SLO,
  buckets: DailyAggBucket[]
): HistoricalSummary[] {
  const initialErrorBudget = 1 - slo.objective.target;

  return buckets.map((bucket: DailyAggBucket): HistoricalSummary => {
    const good = bucket.cumulative_good?.value ?? 0;
    const total = bucket.cumulative_total?.value ?? 0;
    const sliValue = computeSLI(good, total);
    const consumedErrorBudget = sliValue < 0 ? 0 : (1 - sliValue) / initialErrorBudget;
    const errorBudget = toErrorBudget(initialErrorBudget, consumedErrorBudget, true);

    return {
      date: new Date(bucket.key_as_string),
      errorBudget,
      sliValue,
      status: computeSummaryStatus(slo, sliValue, errorBudget),
    };
  });
}

function handleResultForCalendarAlignedAndTimeslices(
  slo: SLO,
  buckets: DailyAggBucket[],
  dateRange: DateRange
): HistoricalSummary[] {
  const initialErrorBudget = 1 - slo.objective.target;

  return buckets.map((bucket: DailyAggBucket): HistoricalSummary => {
    const good = bucket.cumulative_good?.value ?? 0;
    const total = bucket.cumulative_total?.value ?? 0;
    const sliValue = computeSLI(good, total);
    const totalSlices = computeTotalSlicesFromDateRange(dateRange, slo.objective.timesliceWindow!);
    const consumedErrorBudget = (total - good) / (totalSlices * initialErrorBudget);
    const errorBudget = toErrorBudget(initialErrorBudget, consumedErrorBudget);

    return {
      date: new Date(bucket.key_as_string),
      errorBudget,
      sliValue,
      status: computeSummaryStatus(slo, sliValue, errorBudget),
    };
  });
}

function handleResultForRolling(slo: SLO, buckets: DailyAggBucket[]): HistoricalSummary[] {
  const initialErrorBudget = 1 - slo.objective.target;
  const rollingWindowDurationInDays = moment
    .duration(slo.timeWindow.duration.value, toMomentUnitOfTime(slo.timeWindow.duration.unit))
    .asDays();

  const { bucketsPerDay } = getFixedIntervalAndBucketsPerDay(rollingWindowDurationInDays);

  return buckets
    .slice(-bucketsPerDay * rollingWindowDurationInDays)
    .map((bucket: DailyAggBucket): HistoricalSummary => {
      const good = bucket.cumulative_good?.value ?? 0;
      const total = bucket.cumulative_total?.value ?? 0;
      const sliValue = computeSLI(good, total);
      const consumedErrorBudget = sliValue < 0 ? 0 : (1 - sliValue) / initialErrorBudget;
      const errorBudget = toErrorBudget(initialErrorBudget, consumedErrorBudget);

      return {
        date: new Date(bucket.key_as_string),
        errorBudget,
        sliValue,
        status: computeSummaryStatus(slo, sliValue, errorBudget),
      };
    });
}

function generateSearchQuery(
  slo: SLO,
  instanceId: string,
  dateRange: DateRange
): MsearchMultisearchBody {
  const unit = toMomentUnitOfTime(slo.timeWindow.duration.unit);
  const timeWindowDurationInDays = moment.duration(slo.timeWindow.duration.value, unit).asDays();

  const { fixedInterval, bucketsPerDay } =
    getFixedIntervalAndBucketsPerDay(timeWindowDurationInDays);

  const extraFilterByInstanceId =
    !!slo.groupBy && ![slo.groupBy].flat().includes(ALL_VALUE) && instanceId !== ALL_VALUE
      ? [{ term: { 'slo.instanceId': instanceId } }]
      : [];

  return {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { 'slo.id': slo.id } },
          { term: { 'slo.revision': slo.revision } },
          {
            range: {
              '@timestamp': {
                gte: dateRange.from.toISOString(),
                lte: dateRange.to.toISOString(),
              },
            },
          },
          ...extraFilterByInstanceId,
        ],
      },
    },
    aggs: {
      daily: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: fixedInterval,
          extended_bounds: {
            min: dateRange.from.toISOString(),
            max: 'now/d',
          },
        },
        aggs: {
          ...(occurrencesBudgetingMethodSchema.is(slo.budgetingMethod) && {
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
          }),
          ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
            good: {
              sum: {
                field: 'slo.isGoodSlice',
              },
            },
            total: {
              value_count: {
                field: 'slo.isGoodSlice',
              },
            },
          }),
          cumulative_good: {
            moving_fn: {
              buckets_path: 'good',
              window: timeWindowDurationInDays * bucketsPerDay,
              shift: 1,
              script: 'MovingFunctions.sum(values)',
              gap_policy: 'insert_zeros',
            },
          },
          cumulative_total: {
            moving_fn: {
              buckets_path: 'total',
              window: timeWindowDurationInDays * bucketsPerDay,
              shift: 1,
              script: 'MovingFunctions.sum(values)',
              gap_policy: 'insert_zeros',
            },
          },
        },
      },
    },
  };
}

function getDateRange(slo: SLO) {
  if (rollingTimeWindowSchema.is(slo.timeWindow)) {
    const unit = toMomentUnitOfTime(slo.timeWindow.duration.unit);
    const now = moment();
    return {
      from: now
        .clone()
        .subtract(slo.timeWindow.duration.value * 2, unit)
        .startOf('day')
        .toDate(),
      to: now.startOf('minute').toDate(),
    };
  }
  if (calendarAlignedTimeWindowSchema.is(slo.timeWindow)) {
    return toDateRange(slo.timeWindow);
  }

  assertNever(slo.timeWindow);
}

function computeTotalSlicesFromDateRange(dateRange: DateRange, timesliceWindow: Duration) {
  const dateRangeDurationInUnit = moment(dateRange.to).diff(
    dateRange.from,
    toMomentUnitOfTime(timesliceWindow.unit)
  );
  return Math.ceil(dateRangeDurationInUnit / timesliceWindow!.value);
}

export function getFixedIntervalAndBucketsPerDay(durationInDays: number): {
  fixedInterval: string;
  bucketsPerDay: number;
} {
  if (durationInDays <= 7) {
    return { fixedInterval: '1h', bucketsPerDay: 24 };
  }
  if (durationInDays <= 30) {
    return { fixedInterval: '4h', bucketsPerDay: 6 };
  }
  if (durationInDays <= 90) {
    return { fixedInterval: '12h', bucketsPerDay: 2 };
  }
  return { fixedInterval: '1d', bucketsPerDay: 1 };
}
