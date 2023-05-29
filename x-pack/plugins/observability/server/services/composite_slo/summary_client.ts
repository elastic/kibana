/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MsearchMultisearchBody } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  occurrencesBudgetingMethodSchema,
  rollingTimeWindowSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { SLO_DESTINATION_INDEX_NAME } from '../../assets/constants';
import { CompositeSLO, CompositeSLOId, DateRange, Summary } from '../../domain/models';
import { computeErrorBudget, computeSLI, computeSummaryStatus } from '../../domain/services';
import { toDateRange } from '../../domain/services/date_range';

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
      { index: `${SLO_DESTINATION_INDEX_NAME}*` },
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

      let goodEvents = 0;
      let totalEvents = 0;
      let totalWeights = 0;
      for (const bucket of buckets) {
        const sourceSloId = bucket.key;
        const sourceSloGoodEvents = bucket.good.value;
        const sourceSloTotalEvents = bucket.total.value;
        const sourceSloWeight = compositeSlo.sources.find(
          (source) => source.id === sourceSloId
        )!.weight; // used to build the query, therefore exists

        goodEvents += sourceSloGoodEvents * sourceSloWeight;
        totalEvents += sourceSloTotalEvents * sourceSloWeight;
        totalWeights += sourceSloWeight;
      }

      const weightedGoodEvents = goodEvents > 0 ? goodEvents / totalWeights : 0;
      const weightedTotalEvents = totalEvents > 0 ? totalEvents / totalWeights : 0;

      const sliValue = computeSLI({ good: weightedGoodEvents, total: weightedTotalEvents });
      const errorBudget = computeErrorBudget(compositeSlo, {
        dateRange: dateRangeByCompositeSlo[compositeSlo.id],
        good: weightedGoodEvents,
        total: weightedTotalEvents,
      });
      summaryByCompositeSlo[compositeSlo.id] = {
        sliValue,
        errorBudget,
        status: computeSummaryStatus(compositeSlo, sliValue, errorBudget),
      };
    }

    return summaryByCompositeSlo;
  }
}

function generateSearchQuery(
  compositeSlo: CompositeSLO,
  dateRange: DateRange
): MsearchMultisearchBody {
  if (!rollingTimeWindowSchema.is(compositeSlo.timeWindow)) {
    throw new Error('Composite SLO time window not supported');
  }

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
