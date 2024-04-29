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
  BudgetingMethod,
  calendarAlignedTimeWindowSchema,
  Duration,
  DurationUnit,
  FetchHistoricalSummaryParams,
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
import {
  DateRange,
  GroupBy,
  HistoricalSummary,
  Objective,
  SLOId,
  TimeWindow,
} from '../domain/models';
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

export type HistoricalSummaryResponse = t.TypeOf<typeof fetchHistoricalSummaryResponseSchema>;

export interface HistoricalSummaryClient {
  fetch(list: FetchHistoricalSummaryParams): Promise<HistoricalSummaryResponse>;
}

export class DefaultHistoricalSummaryClient implements HistoricalSummaryClient {
  constructor(private esClient: ElasticsearchClient) {}

  async fetch(params: FetchHistoricalSummaryParams): Promise<HistoricalSummaryResponse> {
    const dateRangeBySlo = params.list.reduce<Record<SLOId, DateRange>>(
      (acc, { sloId, timeWindow }) => {
        acc[sloId] = getDateRange(timeWindow);
        return acc;
      },
      {}
    );

    const searches = params.list.flatMap(
      ({ sloId, revision, budgetingMethod, instanceId, groupBy, timeWindow, remoteName }) => [
        {
          index: remoteName
            ? `${remoteName}:${SLO_DESTINATION_INDEX_PATTERN}`
            : SLO_DESTINATION_INDEX_PATTERN,
        },
        generateSearchQuery({
          groupBy,
          sloId,
          revision,
          instanceId,
          timeWindow,
          budgetingMethod,
          dateRange: dateRangeBySlo[sloId],
        }),
      ]
    );

    const historicalSummary: HistoricalSummaryResponse = [];
    if (searches.length === 0) {
      return historicalSummary;
    }

    const result = await this.esClient.msearch({ searches });

    for (let i = 0; i < result.responses.length; i++) {
      const { sloId, instanceId, timeWindow, budgetingMethod, objective } = params.list[i];
      if ('error' in result.responses[i]) {
        // handle erroneous responses with an empty historical summary data
        historicalSummary.push({ sloId, instanceId, data: [] });
        continue;
      }

      // @ts-ignore typing msearch is hard, we cast the response to what it is supposed to be.
      const buckets = (result.responses[i].aggregations?.daily?.buckets as DailyAggBucket[]) || [];

      if (rollingTimeWindowSchema.is(timeWindow)) {
        historicalSummary.push({
          sloId,
          instanceId,
          data: handleResultForRolling(objective, timeWindow, buckets),
        });
        continue;
      }

      if (calendarAlignedTimeWindowSchema.is(timeWindow)) {
        if (timeslicesBudgetingMethodSchema.is(budgetingMethod)) {
          const dateRange = dateRangeBySlo[sloId];
          historicalSummary.push({
            sloId,
            instanceId,
            data: handleResultForCalendarAlignedAndTimeslices(objective, buckets, dateRange),
          });

          continue;
        }

        if (occurrencesBudgetingMethodSchema.is(budgetingMethod)) {
          historicalSummary.push({
            sloId,
            instanceId,
            data: handleResultForCalendarAlignedAndOccurrences(objective, buckets),
          });
          continue;
        }

        assertNever(budgetingMethod);
      }

      assertNever(timeWindow);
    }

    return historicalSummary;
  }
}

function handleResultForCalendarAlignedAndOccurrences(
  objective: Objective,
  buckets: DailyAggBucket[]
): HistoricalSummary[] {
  const initialErrorBudget = 1 - objective.target;

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
      status: computeSummaryStatus(objective, sliValue, errorBudget),
    };
  });
}

function handleResultForCalendarAlignedAndTimeslices(
  objective: Objective,
  buckets: DailyAggBucket[],
  dateRange: DateRange
): HistoricalSummary[] {
  const initialErrorBudget = 1 - objective.target;

  return buckets.map((bucket: DailyAggBucket): HistoricalSummary => {
    const good = bucket.cumulative_good?.value ?? 0;
    const total = bucket.cumulative_total?.value ?? 0;
    const sliValue = computeSLI(good, total);
    const totalSlices = computeTotalSlicesFromDateRange(dateRange, objective.timesliceWindow!);
    const consumedErrorBudget = (total - good) / (totalSlices * initialErrorBudget);
    const errorBudget = toErrorBudget(initialErrorBudget, consumedErrorBudget);

    return {
      date: new Date(bucket.key_as_string),
      errorBudget,
      sliValue,
      status: computeSummaryStatus(objective, sliValue, errorBudget),
    };
  });
}

function handleResultForRolling(
  objective: Objective,
  timeWindow: TimeWindow,
  buckets: DailyAggBucket[]
): HistoricalSummary[] {
  const initialErrorBudget = 1 - objective.target;
  const rollingWindowDurationInDays = moment
    .duration(timeWindow.duration.value, toMomentUnitOfTime(timeWindow.duration.unit))
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
        status: computeSummaryStatus(objective, sliValue, errorBudget),
      };
    });
}

function generateSearchQuery({
  sloId,
  groupBy,
  revision,
  instanceId,
  dateRange,
  timeWindow,
  budgetingMethod,
}: {
  instanceId: string;
  sloId: string;
  groupBy: GroupBy;
  revision: number;
  dateRange: DateRange;
  timeWindow: TimeWindow;
  budgetingMethod: BudgetingMethod;
}): MsearchMultisearchBody {
  const unit = toMomentUnitOfTime(timeWindow.duration.unit);
  const timeWindowDurationInDays = moment.duration(timeWindow.duration.value, unit).asDays();

  const { fixedInterval, bucketsPerDay } =
    getFixedIntervalAndBucketsPerDay(timeWindowDurationInDays);

  const extraFilterByInstanceId =
    !!groupBy && ![groupBy].flat().includes(ALL_VALUE) && instanceId !== ALL_VALUE
      ? [{ term: { 'slo.instanceId': instanceId } }]
      : [];

  return {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { 'slo.id': sloId } },
          { term: { 'slo.revision': revision } },
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
          ...(occurrencesBudgetingMethodSchema.is(budgetingMethod) && {
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
          ...(timeslicesBudgetingMethodSchema.is(budgetingMethod) && {
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

function getDateRange(timeWindow: TimeWindow) {
  if (rollingTimeWindowSchema.is(timeWindow)) {
    const unit = toMomentUnitOfTime(timeWindow.duration.unit as DurationUnit);
    const now = moment();
    return {
      from: now
        .clone()
        .subtract(timeWindow.duration.value * 2, unit)
        .startOf('day')
        .toDate(),
      to: now.startOf('minute').toDate(),
    };
  }
  if (calendarAlignedTimeWindowSchema.is(timeWindow)) {
    return toDateRange(timeWindow);
  }

  assertNever(timeWindow);
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
