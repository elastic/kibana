/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BucketAgg, ESFilter } from 'elasticsearch';
import {
  ERROR_GROUP_ID,
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../../common/constants';
import { Setup } from '../../helpers/setup_request';

export async function getBuckets({
  serviceName,
  groupId,
  bucketSize,
  setup
}: {
  serviceName: string;
  groupId?: string;
  bucketSize: number;
  setup: Setup;
}) {
  const { start, end, esFilterQuery, client, config } = setup;
  const filter: ESFilter[] = [
    { term: { [PROCESSOR_EVENT]: 'error' } },
    { term: { [SERVICE_NAME]: serviceName } },
    {
      range: {
        '@timestamp': {
          gte: start,
          lte: end,
          format: 'epoch_millis'
        }
      }
    }
  ];

  if (groupId) {
    filter.push({ term: { [ERROR_GROUP_ID]: groupId } });
  }

  if (esFilterQuery) {
    filter.push(esFilterQuery);
  }

  const params = {
    index: config.get<string>('apm_oss.errorIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          filter
        }
      },
      aggs: {
        distribution: {
          histogram: {
            field: '@timestamp',
            min_doc_count: 0,
            interval: bucketSize,
            extended_bounds: {
              min: start,
              max: end
            }
          }
        }
      }
    }
  };

  interface Aggs {
    distribution: {
      buckets: Array<BucketAgg<number>>;
    };
  }

  const resp = await client<void, Aggs>('search', params);

  const buckets = resp.aggregations.distribution.buckets.map(bucket => ({
    key: bucket.key,
    count: bucket.doc_count
  }));

  return {
    totalHits: resp.hits.total,
    buckets
  };
}
