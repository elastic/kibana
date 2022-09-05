/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CollectorFetchMethod } from '@kbn/usage-collection-plugin/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type {
  AggregationsValueCountAggregation,
  AggregationsPercentiles,
} from '@elastic/elasticsearch/lib/api/types';
import { fileObjectType } from '../saved_objects';
import type { FileKindUsageSchema } from './schema';

interface Aggs {
  size: AggregationsPercentiles;
  bytes_used: AggregationsValueCountAggregation;
}

interface Args {
  soClient: SavedObjectsClientContract;
}

export async function fetch({
  soClient,
}: Args): ReturnType<CollectorFetchMethod<FileKindUsageSchema>> {
  const { aggregations, total } = await soClient.find<unknown, Aggs>({
    type: fileObjectType.name,
    aggs: {
      size: {
        avg: {
          field: `${fileObjectType.name}.attributes.size`,
        },
      },
      bytes_used: {
        value_count: { field: `${fileObjectType.name}.attributes.size` },
      },
    },
  });

  return {
    count: total,
    bytes_used: aggregations?.bytes_used.field,
    size: aggregations?.size.values,
  };
}
