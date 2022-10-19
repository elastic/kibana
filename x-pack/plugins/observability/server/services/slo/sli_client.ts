/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { assertNever } from '@kbn/std';
import { SLO_DESTINATION_INDEX_NAME } from '../../assets/constants';
import { toDateRange } from '../../domain/services/date_range';
import { InternalQueryError, NotSupportedError } from '../../errors';
import { IndicatorData, SLO } from '../../types/models';
import { calendarAlignedTimeWindowSchema, rollingTimeWindowSchema } from '../../types/schema';

export interface SLIClient {
  fetchCurrentSLIData(slo: SLO): Promise<IndicatorData>;
}

export class DefaultSLIClient implements SLIClient {
  constructor(private esClient: ElasticsearchClient) {}

  async fetchCurrentSLIData(slo: SLO): Promise<IndicatorData> {
    if (slo.budgeting_method !== 'occurrences') {
      throw new NotSupportedError(`Budgeting method: ${slo.budgeting_method}`);
    }

    const result = await this.esClient.search({
      size: 0,
      index: `${SLO_DESTINATION_INDEX_NAME}*`,
      query: {
        bool: {
          filter: [{ term: { 'slo.id': slo.id } }, { term: { 'slo.revision': slo.revision } }],
        },
      },
      aggs: {
        full_window: {
          date_range: {
            field: '@timestamp',
            ranges: [fromSLOTimeWindowToEsRange(slo)],
          },
          aggs: {
            good: { sum: { field: 'slo.numerator' } },
            total: { sum: { field: 'slo.denominator' } },
          },
        },
      },
    });

    // @ts-ignore buckets is not recognized
    const aggs = result.aggregations?.full_window?.buckets[0];
    if (aggs === undefined) {
      throw new InternalQueryError('SLI aggregation query');
    }

    return {
      good: aggs.good.value,
      total: aggs.total.value,
    };
  }
}

function fromSLOTimeWindowToEsRange(slo: SLO): { from: string; to: string } {
  if (calendarAlignedTimeWindowSchema.is(slo.time_window)) {
    const dateRange = toDateRange(slo.time_window);

    return {
      from: `${dateRange.from.toISOString()}`,
      to: `${dateRange.to.toISOString()}`,
    };
  }

  if (rollingTimeWindowSchema.is(slo.time_window)) {
    return {
      from: `now-${slo.time_window.duration.value}${slo.time_window.duration.unit}/m`,
      to: `now/m`,
    };
  }

  assertNever(slo.time_window);
}
