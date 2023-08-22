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

import type {
  FieldHistogramsRequestSchema,
  FieldHistogramsResponseSchema,
} from '../../../common/api_schemas/field_histograms';
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
