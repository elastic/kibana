/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { HttpFetchError } from 'kibana/public';

import { KBN_FIELD_TYPES } from '../../../../../../src/plugins/data/public';

import type { GetTransformsAuditMessagesResponseSchema } from '../../../common/api_schemas/audit_messages';
import type {
  DeleteTransformsRequestSchema,
  DeleteTransformsResponseSchema,
} from '../../../common/api_schemas/delete_transforms';
import type {
  FieldHistogramsRequestSchema,
  FieldHistogramsResponseSchema,
} from '../../../common/api_schemas/field_histograms';
import type {
  ResetTransformsRequestSchema,
  ResetTransformsResponseSchema,
} from '../../../common/api_schemas/reset_transforms';
import type {
  StartTransformsRequestSchema,
  StartTransformsResponseSchema,
} from '../../../common/api_schemas/start_transforms';
import type {
  StopTransformsRequestSchema,
  StopTransformsResponseSchema,
} from '../../../common/api_schemas/stop_transforms';
import type {
  GetTransformNodesResponseSchema,
  GetTransformsResponseSchema,
  PostTransformsPreviewRequestSchema,
  PostTransformsPreviewResponseSchema,
  PutTransformsRequestSchema,
  PutTransformsResponseSchema,
} from '../../../common/api_schemas/transforms';
import type {
  PostTransformsUpdateRequestSchema,
  PostTransformsUpdateResponseSchema,
} from '../../../common/api_schemas/update_transforms';
import type { GetTransformsStatsResponseSchema } from '../../../common/api_schemas/transforms_stats';
import type { TransformId } from '../../../common/types/transform';
import { API_BASE_PATH } from '../../../common/constants';
import type { EsIndex } from '../../../common/types/es_index';
import type { EsIngestPipeline } from '../../../common/types/es_ingest_pipeline';

import { useAppDependencies } from '../app_dependencies';

import { SavedSearchQuery } from './use_search_items';

// Default sampler shard size used for field histograms
export const DEFAULT_SAMPLER_SHARD_SIZE = 5000;

export interface FieldHistogramRequestConfig {
  fieldName: string;
  type?: KBN_FIELD_TYPES;
}

interface FetchOptions {
  asSystemRequest?: boolean;
}

export const useApi = () => {
  const { http } = useAppDependencies();

  return useMemo(
    () => ({
      async getTransformNodes(): Promise<GetTransformNodesResponseSchema | HttpFetchError> {
        try {
          return await http.get(`${API_BASE_PATH}transforms/_nodes`);
        } catch (e) {
          return e;
        }
      },
      async getTransform(
        transformId: TransformId
      ): Promise<GetTransformsResponseSchema | HttpFetchError> {
        try {
          return await http.get(`${API_BASE_PATH}transforms/${transformId}`);
        } catch (e) {
          return e;
        }
      },
      async getTransforms(
        fetchOptions: FetchOptions = {}
      ): Promise<GetTransformsResponseSchema | HttpFetchError> {
        try {
          return await http.get(`${API_BASE_PATH}transforms`, fetchOptions);
        } catch (e) {
          return e;
        }
      },
      async getTransformStats(
        transformId: TransformId
      ): Promise<GetTransformsStatsResponseSchema | HttpFetchError> {
        try {
          return await http.get(`${API_BASE_PATH}transforms/${transformId}/_stats`);
        } catch (e) {
          return e;
        }
      },
      async getTransformsStats(
        fetchOptions: FetchOptions = {}
      ): Promise<GetTransformsStatsResponseSchema | HttpFetchError> {
        try {
          return await http.get(`${API_BASE_PATH}transforms/_stats`, fetchOptions);
        } catch (e) {
          return e;
        }
      },
      async createTransform(
        transformId: TransformId,
        transformConfig: PutTransformsRequestSchema
      ): Promise<PutTransformsResponseSchema | HttpFetchError> {
        try {
          return await http.put(`${API_BASE_PATH}transforms/${transformId}`, {
            body: JSON.stringify(transformConfig),
          });
        } catch (e) {
          return e;
        }
      },
      async updateTransform(
        transformId: TransformId,
        transformConfig: PostTransformsUpdateRequestSchema
      ): Promise<PostTransformsUpdateResponseSchema | HttpFetchError> {
        try {
          return await http.post(`${API_BASE_PATH}transforms/${transformId}/_update`, {
            body: JSON.stringify(transformConfig),
          });
        } catch (e) {
          return e;
        }
      },
      async deleteTransforms(
        reqBody: DeleteTransformsRequestSchema
      ): Promise<DeleteTransformsResponseSchema | HttpFetchError> {
        try {
          return await http.post(`${API_BASE_PATH}delete_transforms`, {
            body: JSON.stringify(reqBody),
          });
        } catch (e) {
          return e;
        }
      },
      async getTransformsPreview(
        obj: PostTransformsPreviewRequestSchema
      ): Promise<PostTransformsPreviewResponseSchema | HttpFetchError> {
        try {
          return await http.post(`${API_BASE_PATH}transforms/_preview`, {
            body: JSON.stringify(obj),
          });
        } catch (e) {
          return e;
        }
      },
      async resetTransforms(
        reqBody: ResetTransformsRequestSchema
      ): Promise<ResetTransformsResponseSchema | HttpFetchError> {
        try {
          return await http.post(`${API_BASE_PATH}reset_transforms`, {
            body: JSON.stringify(reqBody),
          });
        } catch (e) {
          return e;
        }
      },
      async startTransforms(
        reqBody: StartTransformsRequestSchema
      ): Promise<StartTransformsResponseSchema | HttpFetchError> {
        try {
          return await http.post(`${API_BASE_PATH}start_transforms`, {
            body: JSON.stringify(reqBody),
          });
        } catch (e) {
          return e;
        }
      },
      async stopTransforms(
        transformsInfo: StopTransformsRequestSchema
      ): Promise<StopTransformsResponseSchema | HttpFetchError> {
        try {
          return await http.post(`${API_BASE_PATH}stop_transforms`, {
            body: JSON.stringify(transformsInfo),
          });
        } catch (e) {
          return e;
        }
      },
      async getTransformAuditMessages(
        transformId: TransformId
      ): Promise<GetTransformsAuditMessagesResponseSchema | HttpFetchError> {
        try {
          return await http.get(`${API_BASE_PATH}transforms/${transformId}/messages`);
        } catch (e) {
          return e;
        }
      },
      async esSearch(payload: any): Promise<estypes.SearchResponse | HttpFetchError> {
        try {
          return await http.post(`${API_BASE_PATH}es_search`, { body: JSON.stringify(payload) });
        } catch (e) {
          return e;
        }
      },
      async getEsIndices(): Promise<EsIndex[] | HttpFetchError> {
        try {
          return await http.get(`/api/index_management/indices`);
        } catch (e) {
          return e;
        }
      },
      async getEsIngestPipelines(): Promise<EsIngestPipeline[] | HttpFetchError> {
        try {
          return await http.get('/api/ingest_pipelines');
        } catch (e) {
          return e;
        }
      },
      async getHistogramsForFields(
        dataViewTitle: string,
        fields: FieldHistogramRequestConfig[],
        query: string | SavedSearchQuery,
        runtimeMappings?: FieldHistogramsRequestSchema['runtimeMappings'],
        samplerShardSize = DEFAULT_SAMPLER_SHARD_SIZE
      ): Promise<FieldHistogramsResponseSchema | HttpFetchError> {
        try {
          return await http.post(`${API_BASE_PATH}field_histograms/${dataViewTitle}`, {
            body: JSON.stringify({
              query,
              fields,
              samplerShardSize,
              ...(runtimeMappings !== undefined ? { runtimeMappings } : {}),
            }),
          });
        } catch (e) {
          return e;
        }
      },
    }),
    [http]
  );
};
