/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MsearchMultisearchBody } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import { occurrencesBudgetingMethodSchema, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';
import { SLO_DESTINATION_INDEX_NAME } from '../../assets/constants';
import { toDateRange } from '../../domain/services/date_range';
import { DateRange, SLO, SLOId, Summary } from '../../domain/models';
import { computeErrorBudget, computeSLI, computeSummaryStatus } from '../../domain/services';

export interface SummaryClient {
  fetchSummary(sloList: SLO[]): Promise<Record<SLOId, Summary>>;
}

export class DefaultSummaryClient implements SummaryClient {
  constructor(private esClient: ElasticsearchClient) {}

  async fetchSummary(sloList: SLO[]): Promise<Record<SLOId, Summary>> {
    const dateRangeBySlo = sloList.reduce<Record<SLOId, DateRange>>((acc, slo) => {
      acc[slo.id] = toDateRange(slo.timeWindow);
      return acc;
    }, {});
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

      // @ts-ignore
      const { aggregations = {} } = result.responses[i];
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
}

function generateSearchQuery(slo: SLO, dateRange: DateRange): MsearchMultisearchBody {
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
    ...(occurrencesBudgetingMethodSchema.is(slo.budgetingMethod) && {
      aggs: {
        good: { sum: { field: 'slo.numerator' } },
        total: { sum: { field: 'slo.denominator' } },
      },
    }),
    ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
      aggs: {
        good: {
          sum: { field: 'slo.isGoodSlice' },
        },
        total: {
          value_count: { field: 'slo.isGoodSlice' },
        },
      },
    }),
  };
}
