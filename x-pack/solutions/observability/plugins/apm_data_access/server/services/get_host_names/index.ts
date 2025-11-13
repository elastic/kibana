/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { HOST_NAME } from '@kbn/apm-types/es_fields';
import { castArray } from 'lodash';
import { DATASTREAM_DATASET, type DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { getBucketSize, type TimeRangeMetadata } from '../../../common';
import { getPreferredBucketSizeAndDataSource } from '../../../common/utils/get_preferred_bucket_size_and_data_source';
import { ApmDocumentType } from '../../../common/document_type';
import type { ApmDataAccessServicesParams } from '../get_services';

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

const METRICSET_NAMES: Record<ApmDocumentType, string | undefined> = {
  [ApmDocumentType.TransactionMetric]: 'transaction',
  [ApmDocumentType.ServiceTransactionMetric]: 'service_transaction',
  [ApmDocumentType.ServiceDestinationMetric]: 'service_destination',
  [ApmDocumentType.ServiceSummaryMetric]: 'service_summary',
  [ApmDocumentType.TransactionEvent]: undefined,
  [ApmDocumentType.ErrorEvent]: undefined,
  [ApmDocumentType.SpanEvent]: undefined,
};

export function createGetHostNames({ apmEventClient }: ApmDataAccessServicesParams) {
  return async ({
    start,
    end,
    size = MAX_SIZE,
    query,
    documentSources,
    schema,
  }: HostNamesRequest) => {
    const sourcesToUse = getPreferredBucketSizeAndDataSource({
      sources: documentSources.filter((s) => suitableTypes.includes(s.documentType)),
      bucketSizeInSeconds: getBucketSize({ start, end, numBuckets: 50 }).bucketSize,
    });

    const metricsetName = METRICSET_NAMES[sourcesToUse.source.documentType];

    const datasetValue = `${metricsetName}.${sourcesToUse.source.rollupInterval}.otel`;
    const schemaFilter: estypes.QueryDslQueryContainer[] =
      schema === 'semconv'
        ? termQuery(DATASTREAM_DATASET, datasetValue)
        : [
            {
              bool: {
                must_not: termQuery(DATASTREAM_DATASET, datasetValue),
              },
            },
          ];

    const esResponse = await apmEventClient.search('get_apm_host_names', {
      apm: {
        sources: [
          {
            documentType: sourcesToUse.source.documentType,
            rollupInterval: sourcesToUse.source.rollupInterval,
          },
        ],
      },
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...castArray(query),
            ...rangeQuery(start, end),
            ...(metricsetName ? schemaFilter : []),
          ],
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
