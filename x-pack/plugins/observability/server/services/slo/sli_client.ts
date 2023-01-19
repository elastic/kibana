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
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import { assertNever } from '@kbn/std';
import { occurrencesBudgetingMethodSchema, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';
import { SLO_DESTINATION_INDEX_NAME } from '../../assets/constants';
import { toDateRange } from '../../domain/services/date_range';
import { InternalQueryError } from '../../errors';
import { DateRange, Duration, IndicatorData, SLO, SLOId, Summary } from '../../domain/models';
import { computeErrorBudget, computeSLI, computeSummaryStatus } from '../../domain/services';

export interface SummaryClient {
  fetchSummary(sloList: SLO[]): Promise<Record<SLOId, Summary>>;
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

type EsAggregations = Record<WindowName, AggregationsDateRangeAggregate>;

export class DefaultSummaryClient implements SummaryClient {
  constructor(private esClient: ElasticsearchClient) {}

  async fetchSummary(sloList: SLO[]): Promise<Record<SLOId, Summary>> {
    const dateRangeBySlo: Record<SLOId, DateRange> = sloList.reduce(
      (acc, slo) => ({ [slo.id]: toDateRange(slo.timeWindow), ...acc }),
      {}
    );
    const searches = sloList.flatMap((slo) => [
      { index: `${SLO_DESTINATION_INDEX_NAME}*` },
      generateSearchQuery(slo, dateRangeBySlo[slo.id]),
    ]);

    const summaryBySlo: Record<SLOId, Summary> = {};
    if (searches.length === 0) {
      return summaryBySlo;
    }

    const result = await this.esClient.msearch({ searches });

    for (let i = 0; i < result.responses.length; i++) {
      const slo = sloList[i];
      if ('error' in result.responses[i]) {
        const sliValue = computeSLI({ good: 0, total: 0 });
        const errorBudget = computeErrorBudget(slo, {
          dateRange: dateRangeBySlo[slo.id],
          good: 0,
          total: 0,
        });
        summaryBySlo[slo.id] = {
          sliValue,
          errorBudget,
          status: computeSummaryStatus(slo, sliValue, errorBudget),
        };
        continue;
      }

      // @ts-ignore
      const { aggregations } = result.responses[i];
      const good = aggregations?.good?.value ?? 0;
      const total = aggregations?.total?.value ?? 0;

      const sliValue = computeSLI({ good, total });
      const errorBudget = computeErrorBudget(slo, {
        dateRange: dateRangeBySlo[slo.id],
        good,
        total,
      });
      summaryBySlo[slo.id] = {
        sliValue,
        errorBudget,
        status: computeSummaryStatus(slo, sliValue, errorBudget),
      };
    }

    return summaryBySlo;
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
