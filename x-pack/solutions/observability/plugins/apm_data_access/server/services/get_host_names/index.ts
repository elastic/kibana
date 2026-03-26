/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { rangeQuery } from '@kbn/observability-utils-common/es/queries/range_query';
import { HOST_NAME } from '@kbn/apm-types/es_fields';
import { castArray } from 'lodash';
import { type DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { getBucketSize, type TimeRangeMetadata } from '../../../common';
import { getPreferredBucketSizeAndDataSource } from '../../../common/utils/get_preferred_bucket_size_and_data_source';
import { ApmDocumentType } from '../../../common/document_type';
import type { ApmDataAccessServicesParams } from '../get_services';
import { getDatasetFilterForSchema } from '../../lib/helpers/create_es_client/document_type';

const MAX_SIZE = 1000;

export interface HostNamesRequest {
  query?: estypes.QueryDslQueryContainer;
  kuery?: string;
  start: number;
  end: number;
  size?: number;
  documentSources: TimeRangeMetadata['sources'];
  schema: DataSchemaFormat;
}

const suitableTypes = [ApmDocumentType.TransactionMetric];

export function createGetHostNames({ apmEventClient }: ApmDataAccessServicesParams) {
  return async ({
    start,
    end,
    size = MAX_SIZE,
    query,
    documentSources,
    schema,
  }: HostNamesRequest) => {
    const {
      source: { documentType, rollupInterval },
    } = getPreferredBucketSizeAndDataSource({
      sources: documentSources.filter((s) => suitableTypes.includes(s.documentType)),
      bucketSizeInSeconds: getBucketSize({ start, end, numBuckets: 50 }).bucketSize,
    });

    const schemaFilter = getDatasetFilterForSchema(documentType, rollupInterval, schema);

    const esResponse = await apmEventClient.search('get_apm_host_names', {
      apm: {
        sources: [
          {
            documentType,
            rollupInterval,
          },
        ],
      },
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [...castArray(query), ...rangeQuery(start, end), ...schemaFilter],
        },
      },
      aggs: {
        hostNames: {
          terms: {
            field: HOST_NAME,
            size: Math.min(size, MAX_SIZE),
            order: {
              _key: 'asc',
            },
          },
        },
      },
    });

    return esResponse.aggregations?.hostNames.buckets.map((bucket) => bucket.key as string) ?? [];
  };
}
