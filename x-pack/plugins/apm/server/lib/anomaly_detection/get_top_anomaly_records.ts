/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSearchResponse } from '../../../../../typings/elasticsearch';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { MlAnomalySearch } from './types';

const PAGINATION_SIZE = 1000;

export async function getTopAnomalyRecords({
  jobIds,
  from,
  to,
  strategy,
  serviceName,
  transactionType,
  mlAnomalySearch,
  after,
}: {
  jobIds: string[];
  from: number;
  to: number;
  strategy: 'latest' | 'max';
  serviceName?: string;
  transactionType?: string;
  mlAnomalySearch: MlAnomalySearch;
  after?: Record<string, string | number | null>;
}): Promise<
  Array<{
    jobId: string;
    serviceName: string;
    transactionType: string;
    timestamp: number;
    recordScore: number;
  }>
> {
  const params = {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { result_type: 'record' } },
            { terms: { job_id: jobIds } },
            // Exclude interim results, which might get adjusted down or up, or deleted
            // when the bucket closes.
            { term: { is_interim: false } },
            {
              range: {
                timestamp: {
                  gte: from,
                  lt: to,
                  format: 'epoch_millis',
                },
              },
            },
            ...(serviceName
              ? [
                  {
                    term: {
                      partition_field_value: serviceName,
                    },
                  },
                ]
              : []),
            ...(transactionType
              ? [
                  {
                    term: {
                      by_field_value: transactionType,
                    },
                  },
                ]
              : []),
          ],
        },
      },
      aggs: {
        series: {
          composite: {
            ...(after ? { after_key: after } : {}),
            sources: asMutableArray([
              {
                serviceName: {
                  terms: {
                    field: 'partition_field_value',
                    missing_bucket: true,
                  },
                },
              },
              {
                transactionType: {
                  terms: { field: 'by_field_value', missing_bucket: true },
                },
              },
              { jobId: { terms: { field: 'job_id' } } },
            ] as const),
            // Get one more than the max size per page so we can see if there are
            // some that we've missed, rather than always having to do an additional
            // request with the after_key that is returned.
            size: PAGINATION_SIZE + 1,
          },
          aggs: {
            top_record: {
              top_metrics: {
                metrics: asMutableArray([
                  { field: 'record_score' },
                  { field: 'timestamp' },
                ] as const),
                sort: {
                  // Either get the last record, or the highest, depending on the strategy.
                  ...(strategy === 'latest'
                    ? { timestamp: 'desc' as const }
                    : { record_score: 'desc' as const }),
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
    // don't pass jobIds, as we already fetched them before.
    // This prevents another lookup by the ML client.
  > = (await mlAnomalySearch(params, [])) as any;

  const anomalies =
    response.aggregations?.series.buckets.map((bucket) => {
      const { record_score: recordScore, timestamp } = bucket.top_record.top[0]
        .metrics as {
        record_score: number;
        timestamp: number;
      };

      return {
        serviceName: bucket.key.serviceName as string,
        transactionType: bucket.key.transactionType as string,
        recordScore,
        timestamp,
        jobId: bucket.key.jobId as string,
      };
    }) ?? [];

  if (
    anomalies.length > PAGINATION_SIZE &&
    response.aggregations?.series.after_key
  ) {
    anomalies.push(
      ...(await getTopAnomalyRecords({
        jobIds,
        from,
        to,
        strategy,
        serviceName,
        transactionType,
        mlAnomalySearch,
        after: response.aggregations.series.after_key,
      }))
    );
  }

  return anomalies;
}
