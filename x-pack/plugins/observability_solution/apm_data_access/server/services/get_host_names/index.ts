/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { HOST_NAME } from '@kbn/apm-types/es_fields';
import type { TimeRangeMetadata } from '../../../common';
import { getBucketSize } from '../../../common/utils/get_bucket_size';
import { getPreferredBucketSizeAndDataSource } from '../../../common/utils/get_preferred_bucket_size_and_data_source';
import { ApmDocumentType } from '../../../common/document_type';
import type { ApmDataAccessServicesParams } from '../get_services';

const MAX_LIMIT = 10000;

export interface HostNamesRequest {
  query: estypes.QueryDslQueryContainer;
  kuery?: string;
  start: number;
  end: number;
  limit?: number;
  documentSources: TimeRangeMetadata['sources'];
}

const suitableTypes = [ApmDocumentType.TransactionMetric];

export function createGetHostNames({ apmEventClient }: ApmDataAccessServicesParams) {
  return async ({ start, end, limit = MAX_LIMIT, query, documentSources }: HostNamesRequest) => {
    const sourcesToUse = getPreferredBucketSizeAndDataSource({
      sources: documentSources.filter((s) => suitableTypes.includes(s.documentType)),
      bucketSizeInSeconds: getBucketSize({ start, end, numBuckets: 100 }).bucketSize,
    });

    const esResponse = await apmEventClient.search('get_apm_host_names', {
      apm: {
        sources: [
          {
            documentType: sourcesToUse.source.documentType,
            rollupInterval: sourcesToUse.source.rollupInterval,
          },
        ],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [query, ...rangeQuery(start, end)],
          },
        },
        aggs: {
          hostNames: {
            composite: {
              size: limit,
              sources: [
                {
                  hostName: {
                    terms: {
                      field: HOST_NAME,
                    },
                  },
                },
              ],
            },
          },
        },
      },
    });

    return (
      esResponse.aggregations?.hostNames.buckets.map((bucket) => bucket.key.hostName as string) ??
      []
    );
  };
}
