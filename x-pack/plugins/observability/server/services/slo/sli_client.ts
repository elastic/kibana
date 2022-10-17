/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { SLO_DESTINATION_INDEX_NAME } from '../../assets/constants';
import { InternalQueryError, NotSupportedError } from '../../errors';
import { IndicatorData, SLO } from '../../types/models';

export interface SLIClient {
  fetchDataForSLOTimeWindow(slo: SLO): Promise<IndicatorData>;
}

export class DefaultSLIClient implements SLIClient {
  constructor(private esClient: ElasticsearchClient) {}

  async fetchDataForSLOTimeWindow(slo: SLO): Promise<IndicatorData> {
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
            ranges: [fromSLOTimeWindowToRange(slo)],
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

function fromSLOTimeWindowToRange(slo: SLO): { from: string; to: string } {
  if (!slo.time_window.is_rolling) {
    throw new NotSupportedError(`Time window: ${slo.time_window.is_rolling}`);
  }

  return {
    from: `now-${slo.time_window.duration}/m`,
    to: 'now/m',
  };
}
