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
  Duration,
  occurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
  toMomentUnitOfTime,
} from '@kbn/slo-schema';
import moment from 'moment';
import { SLO_DESTINATION_INDEX_PATTERN } from '../../assets/constants';
import { CompositeSLO, CompositeSLOId, DateRange, Summary } from '../../domain/models';
import { computeSLI, computeSummaryStatus, toErrorBudget } from '../../domain/services';
import { toDateRange } from '../../domain/services/date_range';
import { toHighPrecision } from '../../utils/number';

export interface SummaryClient {
  fetchSummary(compositeSloList: CompositeSLO[]): Promise<Record<CompositeSLOId, Summary>>;
}

export class DefaultSummaryClient implements SummaryClient {
  constructor(private esClient: ElasticsearchClient) {}

  async fetchSummary(compositeSloList: CompositeSLO[]): Promise<Record<CompositeSLOId, Summary>> {
    const dateRangeByCompositeSlo = compositeSloList.reduce<Record<CompositeSLOId, DateRange>>(
      (acc, compositeSlo) => {
        acc[compositeSlo.id] = toDateRange(compositeSlo.timeWindow);
        return acc;
      },
      {}
    );
    const searches = compositeSloList.flatMap((compositeSlo) => [
      { index: SLO_DESTINATION_INDEX_PATTERN },
      generateSearchQuery(compositeSlo, dateRangeByCompositeSlo[compositeSlo.id]),
    ]);

    const summaryByCompositeSlo: Record<CompositeSLOId, Summary> = {};
    if (searches.length === 0) {
      return summaryByCompositeSlo;
    }

    const result = await this.esClient.msearch({ searches });

    for (let i = 0; i < result.responses.length; i++) {
      const compositeSlo = compositeSloList[i];

      // @ts-ignore
      const { aggregations = {} } = result.responses[i];
      const buckets = aggregations?.bySloId?.buckets ?? [];

      if (
        calendarAlignedTimeWindowSchema.is(compositeSlo.timeWindow) &&
        timeslicesBudgetingMethodSchema.is(compositeSlo.budgetingMethod)
      ) {
        let sliValue = 0;
        let totalWeights = 0;
        let maxSloTotalSlices = 0;
        for (const bucket of buckets) {
          const sourceSloId = bucket.key;
          const sourceSloGoodSlices = bucket.good.value;
          const sourceSloTotalSlices = bucket.total.value;
          maxSloTotalSlices =
            sourceSloTotalSlices > maxSloTotalSlices ? sourceSloTotalSlices : maxSloTotalSlices;
          const sourceSloSliValue = computeSLI(sourceSloGoodSlices, sourceSloTotalSlices);
          const sourceSloWeight = compositeSlo.sources.find(
            (source) => source.id === sourceSloId
          )!.weight; // used to build the query, therefore exists

          totalWeights += sourceSloWeight;
          sliValue += sourceSloSliValue < 0 ? 0 : sourceSloWeight * sourceSloSliValue;
        }
        sliValue /= totalWeights === 0 ? 1 : totalWeights;

        const totalSlicesInCalendar = computeTotalSlicesFromDateRange(
          dateRangeByCompositeSlo[compositeSlo.id],
          compositeSlo.objective.timesliceWindow!
        );
        const initialErrorBudget = 1 - compositeSlo.objective.target;
        const errorBudgetConsumed =
          ((1 - sliValue) / initialErrorBudget) * (maxSloTotalSlices / totalSlicesInCalendar);

        const errorBudget = toErrorBudget(initialErrorBudget, errorBudgetConsumed);
        summaryByCompositeSlo[compositeSlo.id] = {
          sliValue: toHighPrecision(sliValue),
          errorBudget,
          status: computeSummaryStatus(compositeSlo, sliValue, errorBudget),
        };
      } else {
        let sliValue = 0;
        let totalWeights = 0;
        for (const bucket of buckets) {
          const sourceSloId = bucket.key;
          const sourceSloGood = bucket.good.value;
          const sourceSloTotal = bucket.total.value;
          const sourceSloSliValue = computeSLI(sourceSloGood, sourceSloTotal);
          const sourceSloWeight = compositeSlo.sources.find(
            (source) => source.id === sourceSloId
          )!.weight; // used to build the query, therefore exists

          totalWeights += sourceSloWeight;
          sliValue += sourceSloSliValue < 0 ? 0 : sourceSloWeight * sourceSloSliValue;
        }
        sliValue /= totalWeights === 0 ? 1 : totalWeights;

        const initialErrorBudget = 1 - compositeSlo.objective.target;
        const errorBudgetConsumed = (1 - sliValue) / initialErrorBudget;
        const errorBudget = toErrorBudget(
          initialErrorBudget,
          errorBudgetConsumed,
          calendarAlignedTimeWindowSchema.is(compositeSlo.timeWindow)
        );
        summaryByCompositeSlo[compositeSlo.id] = {
          sliValue: toHighPrecision(sliValue),
          errorBudget,
          status: computeSummaryStatus(compositeSlo, sliValue, errorBudget),
        };
      }
    }

    return summaryByCompositeSlo;
  }
}

function generateSearchQuery(
  compositeSlo: CompositeSLO,
  dateRange: DateRange
): MsearchMultisearchBody {
  return {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': { gte: dateRange.from.toISOString(), lt: dateRange.to.toISOString() },
            },
          },
        ],
        should: compositeSlo.sources.map((source) => ({
          bool: {
            must: [
              { term: { 'slo.id': source.id } },
              { term: { 'slo.revision': source.revision } },
            ],
          },
        })),
        minimum_should_match: 1,
      },
    },
    ...(occurrencesBudgetingMethodSchema.is(compositeSlo.budgetingMethod) && {
      aggs: {
        bySloId: {
          terms: {
            field: 'slo.id',
          },
          aggs: {
            good: { sum: { field: 'slo.numerator' } },
            total: { sum: { field: 'slo.denominator' } },
          },
        },
      },
    }),
    ...(timeslicesBudgetingMethodSchema.is(compositeSlo.budgetingMethod) && {
      aggs: {
        bySloId: {
          terms: {
            field: 'slo.id',
          },
          aggs: {
            good: { sum: { field: 'slo.isGoodSlice' } },
            total: { value_count: { field: 'slo.isGoodSlice' } },
          },
        },
      },
    }),
  };
}

function computeTotalSlicesFromDateRange(dateRange: DateRange, timesliceWindow: Duration) {
  const dateRangeDurationInUnit = moment(dateRange.to).diff(
    dateRange.from,
    toMomentUnitOfTime(timesliceWindow.unit)
  );
  return Math.ceil(dateRangeDurationInUnit / timesliceWindow!.value);
}
