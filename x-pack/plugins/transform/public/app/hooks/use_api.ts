/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';

import { HttpFetchError } from 'kibana/public';

import { KBN_FIELD_TYPES } from '../../../../../../src/plugins/data/public';

import type { GetTransformsAuditMessagesResponseSchema } from '../../../common/api_schemas/audit_messages';
import type {
  DeleteTransformsRequestSchema,
  DeleteTransformsResponseSchema,
} from '../../../common/api_schemas/delete_transforms';
import type { FieldHistogramsResponseSchema } from '../../../common/api_schemas/field_histograms';
import type {
  StartTransformsRequestSchema,
  StartTransformsResponseSchema,
} from '../../../common/api_schemas/start_transforms';
import type {
  StopTransformsRequestSchema,
  StopTransformsResponseSchema,
} from '../../../common/api_schemas/stop_transforms';
import type {
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
import { TransformId } from '../../../common/types/transform';
import { API_BASE_PATH } from '../../../common/constants';
import { EsIndex } from '../../../common/types/es_index';
import type { SearchResponse7 } from '../../../common/shared_imports';

import { useAppDependencies } from '../app_dependencies';

import { SavedSearchQuery } from './use_search_items';

// Default sampler shard size used for field histograms
export const DEFAULT_SAMPLER_SHARD_SIZE = 5000;

export interface FieldHistogramRequestConfig {
  fieldName: string;
  type?: KBN_FIELD_TYPES;
}

export const useApi = () => {
  const { http } = useAppDependencies();

  return useMemo(
    () => ({
      async getTransform(
        transformId: TransformId
      ): Promise<GetTransformsResponseSchema | HttpFetchError> {
        try {
          return await http.get(`${API_BASE_PATH}transforms/${transformId}`);
        } catch (e) {
          return e;
        }
      },
      async getTransforms(): Promise<GetTransformsResponseSchema | HttpFetchError> {
        try {
          return await http.get(`${API_BASE_PATH}transforms`);
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
      async getTransformsStats(): Promise<GetTransformsStatsResponseSchema | HttpFetchError> {
        try {
          return await http.get(`${API_BASE_PATH}transforms/_stats`);
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
      async esSearch(payload: any): Promise<SearchResponse7 | HttpFetchError> {
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
      async getHistogramsForFields(
        indexPatternTitle: string,
        fields: FieldHistogramRequestConfig[],
        query: string | SavedSearchQuery,
        samplerShardSize = DEFAULT_SAMPLER_SHARD_SIZE
      ): Promise<FieldHistogramsResponseSchema | HttpFetchError> {
        try {
          return await http.post(`${API_BASE_PATH}field_histograms/${indexPatternTitle}`, {
            body: JSON.stringify({
              query,
              fields,
              samplerShardSize,
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
