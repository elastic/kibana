/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { HttpFetchError } from '@kbn/core/public';

import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';

import { TransformId } from '../../../../common/types/transform';
import type { FieldHistogramsResponseSchema } from '../../../../common/api_schemas/field_histograms';
import type { GetTransformsAuditMessagesResponseSchema } from '../../../../common/api_schemas/audit_messages';
import type {
  DeleteTransformsRequestSchema,
  DeleteTransformsResponseSchema,
} from '../../../../common/api_schemas/delete_transforms';
import type {
  StartTransformsRequestSchema,
  StartTransformsResponseSchema,
} from '../../../../common/api_schemas/start_transforms';
import type {
  StopTransformsRequestSchema,
  StopTransformsResponseSchema,
} from '../../../../common/api_schemas/stop_transforms';
import type {
  GetTransformsResponseSchema,
  PostTransformsPreviewRequestSchema,
  PostTransformsPreviewResponseSchema,
  PutTransformsRequestSchema,
  PutTransformsResponseSchema,
} from '../../../../common/api_schemas/transforms';
import type { GetTransformsStatsResponseSchema } from '../../../../common/api_schemas/transforms_stats';
import type {
  PostTransformsUpdateRequestSchema,
  PostTransformsUpdateResponseSchema,
} from '../../../../common/api_schemas/update_transforms';

import { EsIndex } from '../../../../common/types/es_index';

import type { SavedSearchQuery } from '../use_search_items';

// Default sampler shard size used for field histograms
export const DEFAULT_SAMPLER_SHARD_SIZE = 5000;

export interface FieldHistogramRequestConfig {
  fieldName: string;
  type?: KBN_FIELD_TYPES;
}

const apiFactory = () => ({
  async getTransform(
    transformId: TransformId
  ): Promise<GetTransformsResponseSchema | HttpFetchError> {
    return Promise.resolve({ count: 0, transforms: [] });
  },
  async getTransforms(): Promise<GetTransformsResponseSchema | HttpFetchError> {
    return Promise.resolve({ count: 0, transforms: [] });
  },
  async getTransformStats(
    transformId: TransformId
  ): Promise<GetTransformsStatsResponseSchema | HttpFetchError> {
    return Promise.resolve({ count: 0, transforms: [] });
  },
  async getTransformsStats(): Promise<GetTransformsStatsResponseSchema | HttpFetchError> {
    return Promise.resolve({ count: 0, transforms: [] });
  },
  async createTransform(
    transformId: TransformId,
    transformConfig: PutTransformsRequestSchema
  ): Promise<PutTransformsResponseSchema | HttpFetchError> {
    return Promise.resolve({ transformsCreated: [], errors: [] });
  },
  async updateTransform(
    transformId: TransformId,
    transformConfig: PostTransformsUpdateRequestSchema
  ): Promise<PostTransformsUpdateResponseSchema | HttpFetchError> {
    return Promise.resolve({
      id: 'the-test-id',
      source: { index: ['the-index-name'], query: { match_all: {} } },
      dest: { index: 'user-the-destination-index-name' },
      frequency: '10m',
      pivot: {
        group_by: { the_group: { terms: { field: 'the-group-by-field' } } },
        aggregations: { the_agg: { value_count: { field: 'the-agg-field' } } },
      },
      description: 'the-description',
      settings: { docs_per_second: null },
      version: '8.0.0',
      create_time: 1598860879097,
    });
  },
  async deleteTransforms(
    reqBody: DeleteTransformsRequestSchema
  ): Promise<DeleteTransformsResponseSchema | HttpFetchError> {
    return Promise.resolve({});
  },
  async getTransformsPreview(
    obj: PostTransformsPreviewRequestSchema
  ): Promise<PostTransformsPreviewResponseSchema | HttpFetchError> {
    return Promise.resolve({
      generated_dest_index: {
        mappings: {
          _meta: {
            _transform: {
              transform: 'the-transform',
              version: { create: 'the-version' },
              creation_date_in_millis: 0,
            },
            created_by: 'mock',
          },
          properties: {},
        },
        settings: { index: { number_of_shards: '1', auto_expand_replicas: '0-1' } },
        aliases: {},
      },
      preview: [],
    });
  },
  async startTransforms(
    reqBody: StartTransformsRequestSchema
  ): Promise<StartTransformsResponseSchema | HttpFetchError> {
    return Promise.resolve({});
  },
  async stopTransforms(
    transformsInfo: StopTransformsRequestSchema
  ): Promise<StopTransformsResponseSchema | HttpFetchError> {
    return Promise.resolve({});
  },
  async getTransformAuditMessages(
    transformId: TransformId
  ): Promise<GetTransformsAuditMessagesResponseSchema | HttpFetchError> {
    return Promise.resolve([]);
  },
  async esSearch(payload: any): Promise<estypes.SearchResponse | HttpFetchError> {
    const hits = [];

    // simulate a cross cluster search result
    // against a cluster that doesn't support fields
    if (payload.index.includes(':')) {
      hits.push({
        _id: 'the-doc',
        _index: 'the-index',
      });
    }

    return Promise.resolve({
      hits: {
        hits,
        total: {
          value: 0,
          relation: 'eq',
        },
        max_score: 0,
      },
      timed_out: false,
      took: 10,
      _shards: { total: 1, successful: 1, failed: 0, skipped: 0 },
    });
  },

  async getEsIndices(): Promise<EsIndex[] | HttpFetchError> {
    return Promise.resolve([]);
  },
  async getHistogramsForFields(
    dataViewTitle: string,
    fields: FieldHistogramRequestConfig[],
    query: string | SavedSearchQuery,
    samplerShardSize = DEFAULT_SAMPLER_SHARD_SIZE
  ): Promise<FieldHistogramsResponseSchema | HttpFetchError> {
    return Promise.resolve([]);
  },
});

export const useApi = () => {
  return apiFactory();
};
