/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';

import { HttpFetchError } from 'kibana/public';

import { KBN_FIELD_TYPES } from '../../../../../../src/plugins/data/public';

import type {
  DeleteTransformsRequestSchema,
  DeleteTransformsResponseSchema,
} from '../../../common/api_schemas/delete_transforms';
import type {
  StartTransformsRequestSchema,
  StartTransformsResponseSchema,
} from '../../../common/api_schemas/start_transforms';
import type {
  StopTransformsRequestSchema,
  StopTransformsResponseSchema,
} from '../../../common/api_schemas/stop_transforms';
import { TransformIdParamSchema } from '../../../common/api_schemas/common';
import type {
  GetTransformsResponseSchema,
  PostTransformsPreviewRequestSchema,
  PostTransformsPreviewResponseSchema,
  PutTransformsRequestSchema,
  PutTransformsResponseSchema,
} from '../../../common/api_schemas/transforms';
import type { GetTransformsStatsResponseSchema } from '../../../common/api_schemas/transforms_stats';
import { TransformId } from '../../../common/types/transform';
import { API_BASE_PATH } from '../../../common/constants';

import { useAppDependencies } from '../app_dependencies';

import { EsIndex } from './use_api_types';
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
      getTransform({
        transformId,
      }: TransformIdParamSchema): Promise<GetTransformsResponseSchema | HttpFetchError> {
        return http.get(`${API_BASE_PATH}transforms/${transformId}`);
      },
      getTransforms(): Promise<GetTransformsResponseSchema | HttpFetchError> {
        return http.get(`${API_BASE_PATH}transforms`);
      },
      getTransformStats(
        transformId: TransformId
      ): Promise<GetTransformsStatsResponseSchema | HttpFetchError> {
        return http.get(`${API_BASE_PATH}transforms/${transformId}/_stats`);
      },
      getTransformsStats(): Promise<GetTransformsStatsResponseSchema | HttpFetchError> {
        return http.get(`${API_BASE_PATH}transforms/_stats`);
      },
      createTransform(
        transformId: TransformId,
        transformConfig: PutTransformsRequestSchema
      ): Promise<PutTransformsResponseSchema> {
        return http.put(`${API_BASE_PATH}transforms/${transformId}`, {
          body: JSON.stringify(transformConfig),
        });
      },
      updateTransform(transformId: TransformId, transformConfig: any): Promise<any> {
        return http.post(`${API_BASE_PATH}transforms/${transformId}/_update`, {
          body: JSON.stringify(transformConfig),
        });
      },
      deleteTransforms(
        reqBody: DeleteTransformsRequestSchema
      ): Promise<DeleteTransformsResponseSchema> {
        return http.post(`${API_BASE_PATH}delete_transforms`, {
          body: JSON.stringify(reqBody),
        });
      },
      getTransformsPreview(
        obj: PostTransformsPreviewRequestSchema
      ): Promise<PostTransformsPreviewResponseSchema> {
        return http.post(`${API_BASE_PATH}transforms/_preview`, {
          body: JSON.stringify(obj),
        });
      },
      startTransforms(
        reqBody: StartTransformsRequestSchema
      ): Promise<StartTransformsResponseSchema> {
        return http.post(`${API_BASE_PATH}start_transforms`, {
          body: JSON.stringify(reqBody),
        });
      },
      stopTransforms(
        transformsInfo: StopTransformsRequestSchema
      ): Promise<StopTransformsResponseSchema> {
        return http.post(`${API_BASE_PATH}stop_transforms`, {
          body: JSON.stringify(transformsInfo),
        });
      },
      getTransformAuditMessages(transformId: TransformId): Promise<any> {
        return http.get(`${API_BASE_PATH}transforms/${transformId}/messages`);
      },
      esSearch(payload: any): Promise<any> {
        return http.post(`${API_BASE_PATH}es_search`, { body: JSON.stringify(payload) });
      },
      getIndices(): Promise<EsIndex[]> {
        return http.get(`/api/index_management/indices`);
      },
      getHistogramsForFields(
        indexPatternTitle: string,
        fields: FieldHistogramRequestConfig[],
        query: string | SavedSearchQuery,
        samplerShardSize = DEFAULT_SAMPLER_SHARD_SIZE
      ) {
        return http.post(`${API_BASE_PATH}field_histograms/${indexPatternTitle}`, {
          body: JSON.stringify({
            query,
            fields,
            samplerShardSize,
          }),
        });
      },
    }),
    [http]
  );
};
