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
  AggregationsValueCountAggregate,
  MsearchMultisearchBody,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  ALL_VALUE,
  occurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
  toMomentUnitOfTime,
} from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import moment from 'moment';
import { SLO_DESTINATION_INDEX_PATTERN } from '../../assets/constants';
import { DateRange, Duration, IndicatorData, SLO } from '../../domain/models';
import { InternalQueryError } from '../../errors';
import { getDelayInSecondsFromSLO } from '../../domain/services/get_delay_in_seconds_from_slo';

export interface SLIClient {
  fetchSLIDataFrom(
    slo: SLO,
    instanceId: string,
    lookbackWindows: LookbackWindow[]
  ): Promise<Record<WindowName, IndicatorData>>;
}

type WindowName = string;

interface LookbackWindow {
  name: WindowName;
  duration: Duration;
}

type EsAggregations = Record<WindowName, AggregationsDateRangeAggregate>;

export class DefaultSLIClient implements SLIClient {
  constructor(private esClient: ElasticsearchClient) {}

  async fetchSLIDataFrom(
    slo: SLO,
    instanceId: string,
    lookbackWindows: LookbackWindow[]
  ): Promise<Record<WindowName, IndicatorData>> {
    const sortedLookbackWindows = [...lookbackWindows].sort((a, b) =>
      a.duration.isShorterThan(b.duration) ? 1 : -1
    );
    const longestLookbackWindow = sortedLookbackWindows[0];
    const delayInSeconds = getDelayInSecondsFromSLO(slo);
    const longestDateRange = getLookbackDateRange(longestLookbackWindow.duration, delayInSeconds);

    if (occurrencesBudgetingMethodSchema.is(slo.budgetingMethod)) {
      const result = await this.esClient.search<unknown, EsAggregations>({
        ...commonQuery(slo, instanceId, longestDateRange),
        index: SLO_DESTINATION_INDEX_PATTERN,
        aggs: toLookbackWindowsAggregationsQuery(sortedLookbackWindows, delayInSeconds),
      });

      return handleWindowedResult(result.aggregations, lookbackWindows);
    }

    if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
      const result = await this.esClient.search<unknown, EsAggregations>({
        ...commonQuery(slo, instanceId, longestDateRange),
        index: SLO_DESTINATION_INDEX_PATTERN,
        aggs: toLookbackWindowsSlicedAggregationsQuery(sortedLookbackWindows, delayInSeconds),
      });

      return handleWindowedResult(result.aggregations, lookbackWindows);
    }

    assertNever(slo.budgetingMethod);
  }
}

function commonQuery(
  slo: SLO,
  instanceId: string,
  dateRange: DateRange
): Pick<MsearchMultisearchBody, 'size' | 'query'> {
  const filter: QueryDslQueryContainer[] = [
    { term: { 'slo.id': slo.id } },
    { term: { 'slo.revision': slo.revision } },
    {
      range: {
        '@timestamp': { gte: dateRange.from.toISOString(), lt: dateRange.to.toISOString() },
      },
    },
  ];

  if (instanceId !== ALL_VALUE) {
    filter.push({ term: { 'slo.instanceId': instanceId } });
  }

  return {
    size: 0,
    query: {
      bool: {
        filter,
      },
    },
  };
}

function toLookbackWindowsAggregationsQuery(
  sortedLookbackWindow: LookbackWindow[],
  delayInSeconds = 0
) {
  return sortedLookbackWindow.reduce<Record<string, AggregationsAggregationContainer>>(
    (acc, lookbackWindow) => ({
      ...acc,
      [lookbackWindow.name]: {
        date_range: {
          field: '@timestamp',
          ranges: [
            {
              from: `now-${lookbackWindow.duration.format()}${
                delayInSeconds > 0 ? '-' + delayInSeconds + 's' : ''
              }/m`,
              to: `now${delayInSeconds > 0 ? '-' + delayInSeconds + 's' : ''}/m`,
            },
          ],
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

function toLookbackWindowsSlicedAggregationsQuery(
  lookbackWindows: LookbackWindow[],
  delayInSeconds = 0
) {
  return lookbackWindows.reduce<Record<string, AggregationsAggregationContainer>>(
    (acc, lookbackWindow) => ({
      ...acc,
      [lookbackWindow.name]: {
        date_range: {
          field: '@timestamp',
          ranges: [
            {
              from: `now-${lookbackWindow.duration.format()}${
                delayInSeconds > 0 ? '-' + delayInSeconds + 's' : ''
              }/m`,
              to: `now${delayInSeconds > 0 ? '-' + delayInSeconds + 's' : ''}/m`,
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
  for (const lookbackWindow of lookbackWindows) {
    const windowAggBuckets = aggregations[lookbackWindow.name]?.buckets ?? [];
    if (!Array.isArray(windowAggBuckets) || windowAggBuckets.length === 0) {
      throw new InternalQueryError('Invalid aggregation bucket response');
    }
    const bucket = windowAggBuckets[0];
    const good = (bucket.good as AggregationsSumAggregate).value;
    const total = (bucket.total as AggregationsValueCountAggregate).value;
    if (good === null || total === null) {
      throw new InternalQueryError('Invalid aggregation sum bucket response');
    }

    indicatorDataPerLookbackWindow[lookbackWindow.name] = {
      good,
      total,
      dateRange: { from: new Date(bucket.from_as_string!), to: new Date(bucket.to_as_string!) },
    };
  }

  return indicatorDataPerLookbackWindow;
}

function getLookbackDateRange(duration: Duration, delayInSeconds = 0): { from: Date; to: Date } {
  const unit = toMomentUnitOfTime(duration.unit);
  const now = moment.utc().subtract(delayInSeconds, 'seconds').startOf('minute');
  const from = now.clone().subtract(duration.value, unit);
  const to = now.clone();

  return {
    from: from.toDate(),
    to: to.toDate(),
  };
}
