/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchResponse } from '../../../../../../typings/elasticsearch';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import { Setup } from '../../helpers/setup_request';

export type ESResponse = Exclude<
  PromiseReturnType<typeof anomalySeriesFetcher>,
  undefined
>;

export async function anomalySeriesFetcher({
  serviceName,
  transactionType,
  intervalString,
  ml,
  start,
  end,
}: {
  serviceName: string;
  transactionType: string;
  intervalString: string;
  ml: Required<Setup>['ml'];
  start: number;
  end: number;
}) {
  const params = {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { terms: { result_type: ['model_plot', 'record'] } },
            { term: { partition_field_value: serviceName } },
            { term: { by_field_value: transactionType } },
            {
              range: {
                timestamp: {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
      aggs: {
        job_id: {
          terms: {
            field: 'job_id',
          },
          aggs: {
            ml_avg_response_times: {
              date_histogram: {
                field: 'timestamp',
                fixed_interval: intervalString,
                extended_bounds: { min: start, max: end },
              },
              aggs: {
                anomaly_score: {
                  top_metrics: {
                    metrics: [
                      { field: 'record_score' },
                      { field: 'timestamp' },
                      { field: 'bucket_span' },
                    ] as const,
                    sort: {
                      record_score: 'desc' as const,
                    },
                  },
                },
                lower: { min: { field: 'model_lower' } },
                upper: { max: { field: 'model_upper' } },
              },
            },
          },
        },
      },
    },
  };

  return (ml.mlSystem.mlAnomalySearch(params, []) as unknown) as Promise<
    ESSearchResponse<unknown, typeof params>
  >;
}
