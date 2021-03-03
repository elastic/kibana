/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { ESSearchResponse } from '../../../../../typings/elasticsearch';
import { MlAnomalySearch } from './types';

const MAX_JOBS = 100;

export async function getLastAnomalyBuckets({
  jobIds,
  from,
  to,
  mlAnomalySearch,
}: {
  jobIds: string[];
  from: number;
  to: number;
  mlAnomalySearch: MlAnomalySearch;
}) {
  const params = {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { result_type: 'bucket' } },
            { term: { is_interim: false } },
            {
              range: {
                timestamp: { gte: from, lt: to, format: 'epoch_millis' },
              },
            },
            { terms: { job_id: jobIds } },
          ],
        },
      },
      aggs: {
        job: {
          terms: {
            field: 'job_id',
            size: MAX_JOBS,
          },
          aggs: {
            latest: {
              top_metrics: {
                metrics: asMutableArray([{ field: 'timestamp' }] as const),
                sort: {
                  timestamp: 'desc' as const,
                },
              },
            },
          },
        },
      },
    },
  };

  const response: ESSearchResponse<
    unknown,
    typeof params
  > = (await mlAnomalySearch(params, [])) as any;

  return (
    response.aggregations?.job.buckets.map((bucket) => {
      return {
        jobId: bucket.key,
        timestamp: bucket.latest.top[0].metrics.timestamp as number,
      };
    }) ?? []
  );
}
