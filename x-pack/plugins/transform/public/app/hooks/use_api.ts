/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { IHttpFetchError } from '@kbn/core-http-browser';

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { DEFAULT_SAMPLER_SHARD_SIZE } from '@kbn/ml-agg-utils';

import {
  ReauthorizeTransformsRequestSchema,
  ReauthorizeTransformsResponseSchema,
} from '../../../common/api_schemas/reauthorize_transforms';
import type {
  FieldHistogramsRequestSchema,
  FieldHistogramsResponseSchema,
} from '../../../common/api_schemas/field_histograms';
import type {
  ResetTransformsRequestSchema,
  ResetTransformsResponseSchema,
} from '../../../common/api_schemas/reset_transforms';
import type {
  StopTransformsRequestSchema,
  StopTransformsResponseSchema,
} from '../../../common/api_schemas/stop_transforms';
import type {
  ScheduleNowTransformsRequestSchema,
  ScheduleNowTransformsResponseSchema,
} from '../../../common/api_schemas/schedule_now_transforms';
import type {
  PostTransformsPreviewRequestSchema,
  PostTransformsPreviewResponseSchema,
} from '../../../common/api_schemas/transforms';
import type {
  PostTransformsUpdateRequestSchema,
  PostTransformsUpdateResponseSchema,
} from '../../../common/api_schemas/update_transforms';
import type { TransformId } from '../../../common/types/transform';
import { addInternalBasePath } from '../../../common/constants';
import type { EsIndex } from '../../../common/types/es_index';
import type { EsIngestPipeline } from '../../../common/types/es_ingest_pipeline';

import { useAppDependencies } from '../app_dependencies';

import type { SavedSearchQuery } from './use_search_items';

export interface FieldHistogramRequestConfig {
  fieldName: string;
  type?: KBN_FIELD_TYPES;
}

export const useApi = () => {
  const { http } = useAppDependencies();

  return useMemo(
    () => ({
      async updateTransform(
        transformId: TransformId,
        transformConfig: PostTransformsUpdateRequestSchema
      ): Promise<PostTransformsUpdateResponseSchema | IHttpFetchError> {
        try {
          return await http.post(addInternalBasePath(`transforms/${transformId}/_update`), {
            body: JSON.stringify(transformConfig),
            version: '1',
          });
        } catch (e) {
          return e;
        }
      },
      async getTransformsPreview(
        obj: PostTransformsPreviewRequestSchema
      ): Promise<PostTransformsPreviewResponseSchema | IHttpFetchError> {
        try {
          return await http.post(addInternalBasePath(`transforms/_preview`), {
            body: JSON.stringify(obj),
            version: '1',
          });
        } catch (e) {
          return e;
        }
      },
      async reauthorizeTransforms(
        reqBody: ReauthorizeTransformsRequestSchema
      ): Promise<ReauthorizeTransformsResponseSchema | IHttpFetchError> {
        try {
          return await http.post(addInternalBasePath(`reauthorize_transforms`), {
            body: JSON.stringify(reqBody),
            version: '1',
          });
        } catch (e) {
          return e;
        }
      },

      async resetTransforms(
        reqBody: ResetTransformsRequestSchema
      ): Promise<ResetTransformsResponseSchema | IHttpFetchError> {
        try {
          return await http.post(addInternalBasePath(`reset_transforms`), {
            body: JSON.stringify(reqBody),
            version: '1',
          });
        } catch (e) {
          return e;
        }
      },
      async stopTransforms(
        transformsInfo: StopTransformsRequestSchema
      ): Promise<StopTransformsResponseSchema | IHttpFetchError> {
        try {
          return await http.post(addInternalBasePath(`stop_transforms`), {
            body: JSON.stringify(transformsInfo),
            version: '1',
          });
        } catch (e) {
          return e;
        }
      },
      async scheduleNowTransforms(
        transformsInfo: ScheduleNowTransformsRequestSchema
      ): Promise<ScheduleNowTransformsResponseSchema | IHttpFetchError> {
        try {
          return await http.post(addInternalBasePath(`schedule_now_transforms`), {
            body: JSON.stringify(transformsInfo),
            version: '1',
          });
        } catch (e) {
          return e;
        }
      },
      async getEsIndices(): Promise<EsIndex[] | IHttpFetchError> {
        try {
          return await http.get(`/api/index_management/indices`, { version: '1' });
        } catch (e) {
          return e;
        }
      },
      async getEsIngestPipelines(): Promise<EsIngestPipeline[] | IHttpFetchError> {
        try {
          return await http.get('/api/ingest_pipelines', { version: '1' });
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
      ): Promise<FieldHistogramsResponseSchema | IHttpFetchError> {
        try {
          return await http.post(addInternalBasePath(`field_histograms/${dataViewTitle}`), {
            body: JSON.stringify({
              query,
              fields,
              samplerShardSize,
              ...(runtimeMappings !== undefined ? { runtimeMappings } : {}),
            }),
            version: '1',
          });
        } catch (e) {
          return e;
        }
      },
    }),
    [http]
  );
};
