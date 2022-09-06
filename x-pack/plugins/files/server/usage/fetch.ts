/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type {
  AggregationsSumAggregate,
  AggregationsAvgAggregate,
  AggregationsTermsAggregateBase,
  AggregationsSignificantStringTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/types';
import { FileStatus } from '../../common';
import { fileObjectType, fileShareObjectType } from '../saved_objects';
import type { FileKindUsageSchema } from './schema';

type SizeBucket = AggregationsSignificantStringTermsBucketKeys & { size: AggregationsSumAggregate };

interface Aggs {
  size: AggregationsAvgAggregate;
  bytes_used: AggregationsSumAggregate;
  file_kind_breakdown: AggregationsTermsAggregateBase<SizeBucket>;
  status: AggregationsTermsAggregateBase<SizeBucket>;
}

interface Args {
  soClient: SavedObjectsClientContract;
}

export async function fetch({ soClient }: Args): Promise<FileKindUsageSchema> {
  const [{ aggregations, total: filesTotal }, { total: sharesTotal }] = await Promise.all([
    soClient.find<unknown, Aggs>({
      type: fileObjectType.name,
      aggs: {
        size: {
          avg: {
            field: `${fileObjectType.name}.attributes.size`,
          },
        },
        bytes_used: {
          sum: { field: `${fileObjectType.name}.attributes.size` },
        },
        file_kind_breakdown: {
          terms: {
            field: `${fileObjectType.name}.attributes.FileKind`,
          },
          aggs: {
            size: {
              avg: {
                field: `${fileObjectType.name}.attributes.size`,
              },
            },
          },
        },
        status: {
          terms: {
            field: `${fileObjectType.name}.attributes.Status`,
          },
          aggs: {
            size: {
              avg: {
                field: `${fileObjectType.name}.attributes.size`,
              },
            },
          },
        },
      },
    }),
    soClient.find({ type: fileShareObjectType.name }),
  ]);

  return {
    count: filesTotal,
    bytes_used: aggregations?.bytes_used.value ?? null,
    avg_size: aggregations?.size.value ?? null,
    file_kind_breakdown: (aggregations?.file_kind_breakdown.buckets as SizeBucket[])?.map(
      ({ key, size, doc_count: count }) => ({
        kind: key,
        count,
        avg_size: size.value,
      })
    ),
    status: (aggregations?.status.buckets as SizeBucket[])?.reduce(
      (acc, { key, size, doc_count: count }) => ({
        ...acc,
        [key as FileStatus]: {
          count,
          avg_size: size.value,
        },
      }),
      {} as FileKindUsageSchema['status']
    ),
    share_count: sharesTotal,
  };
}
