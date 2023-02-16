/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MsearchMultisearchBody } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  calendarAlignedTimeWindowSchema,
  occurrencesBudgetingMethodSchema,
  rollingTimeWindowSchema,
  timeslicesBudgetingMethodSchema,
  toMomentUnitOfTime,
} from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import moment from 'moment';

import { SLO_DESTINATION_INDEX_NAME } from '../../assets/constants';
import { DateRange, HistoricalSummary, SLO, SLOId } from '../../domain/models';
import {
  computeSLI,
  computeSummaryStatus,
  computeTotalSlicesFromDateRange,
  toDateRange,
  toErrorBudget,
} from '../../domain/services';

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

export interface HistoricalSummaryClient {
  fetch(sloList: SLO[]): Promise<Record<SLOId, HistoricalSummary[]>>;
}

export class DefaultHistoricalSummaryClient implements HistoricalSummaryClient {
  constructor(private esClient: ElasticsearchClient) {}

  async fetch(sloList: SLO[]): Promise<Record<SLOId, HistoricalSummary[]>> {
    const dateRangeBySlo: Record<SLOId, DateRange> = sloList.reduce(
      (acc, slo) => ({ [slo.id]: getDateRange(slo), ...acc }),
      {}
    );

    const searches = sloList.flatMap((slo) => [
      { index: `${SLO_DESTINATION_INDEX_NAME}*` },
      generateSearchQuery(slo, dateRangeBySlo[slo.id]),
    ]);

    const historicalSummaryBySlo: Record<SLOId, HistoricalSummary[]> = {};
    if (searches.length === 0) {
      return historicalSummaryBySlo;
    }

    const result = await this.esClient.msearch({ searches });

    for (let i = 0; i < result.responses.length; i++) {
      const slo = sloList[i];
      if ('error' in result.responses[i]) {
        // handle errorneous responses with an empty historical summary
        historicalSummaryBySlo[slo.id] = [];
        continue;
      }

      // @ts-ignore typing msearch is hard, we cast the response to what it is supposed to be.
      const buckets = (result.responses[i].aggregations?.daily?.buckets as DailyAggBucket[]) || [];

      if (rollingTimeWindowSchema.is(slo.timeWindow)) {
        historicalSummaryBySlo[slo.id] = handleResultForRolling(slo, buckets);
        continue;
      }

      if (calendarAlignedTimeWindowSchema.is(slo.timeWindow)) {
        if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
          const dateRange = dateRangeBySlo[slo.id];
          historicalSummaryBySlo[slo.id] = handleResultForCalendarAlignedAndTimeslices(
            slo,
            buckets,
            dateRange
          );
          continue;
        }

        if (occurrencesBudgetingMethodSchema.is(slo.budgetingMethod)) {
          const dateRange = dateRangeBySlo[slo.id];
          historicalSummaryBySlo[slo.id] = handleResultForCalendarAlignedAndOccurrences(
            slo,
            buckets,
            dateRange
          );
          continue;
        }

        assertNever(slo.budgetingMethod);
      }

      assertNever(slo.timeWindow);
    }

    return historicalSummaryBySlo;
  }
}

function handleResultForCalendarAlignedAndOccurrences(
  slo: SLO,
  buckets: DailyAggBucket[],
  dateRange: DateRange
): HistoricalSummary[] {
  const initialErrorBudget = 1 - slo.objective.target;

  return buckets.map((bucket: DailyAggBucket): HistoricalSummary => {
    const good = bucket.cumulative_good?.value ?? 0;
    const total = bucket.cumulative_total?.value ?? 0;
    const sliValue = computeSLI({ good, total });

    const durationCalendarPeriod = moment(dateRange.to).diff(dateRange.from, 'minutes');
    const bucketDate = moment(bucket.key_as_string).endOf('day');
    const durationSinceBeginning = bucketDate.isAfter(dateRange.to)
      ? durationCalendarPeriod
      : moment(bucketDate).diff(dateRange.from, 'minutes');

    const totalEventsEstimatedAtPeriodEnd = Math.round(
      (total / durationSinceBeginning) * durationCalendarPeriod
    );

    const consumedErrorBudget =
      (total - good) / (totalEventsEstimatedAtPeriodEnd * initialErrorBudget);

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
    const sliValue = computeSLI({ good, total });
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

  return buckets
    .slice(-rollingWindowDurationInDays)
    .map((bucket: DailyAggBucket): HistoricalSummary => {
      const good = bucket.cumulative_good?.value ?? 0;
      const total = bucket.cumulative_total?.value ?? 0;
      const sliValue = computeSLI({ good, total });
      const consumedErrorBudget = total === 0 ? 0 : (total - good) / (total * initialErrorBudget);
      const errorBudget = toErrorBudget(initialErrorBudget, consumedErrorBudget);

      return {
        date: new Date(bucket.key_as_string),
        errorBudget,
        sliValue,
        status: computeSummaryStatus(slo, sliValue, errorBudget),
      };
    });
}

function generateSearchQuery(slo: SLO, dateRange: DateRange): MsearchMultisearchBody {
  const unit = toMomentUnitOfTime(slo.timeWindow.duration.unit);
  const timeWindowDurationInDays = moment.duration(slo.timeWindow.duration.value, unit).asDays();

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
        ],
      },
    },
    aggs: {
      daily: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: '1d',
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
              window: timeWindowDurationInDays,
              shift: 1,
              script: 'MovingFunctions.sum(values)',
            },
          },
          cumulative_total: {
            moving_fn: {
              buckets_path: 'total',
              window: timeWindowDurationInDays,
              shift: 1,
              script: 'MovingFunctions.sum(values)',
            },
          },
        },
      },
    },
  };
}

function getDateRange(slo: SLO) {
  const unit = toMomentUnitOfTime(slo.timeWindow.duration.unit);

  if (rollingTimeWindowSchema.is(slo.timeWindow)) {
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
