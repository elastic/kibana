/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { DEFAULT_SAMPLER_SHARD_SIZE } from '@kbn/ml-agg-utils';

import type { FieldHistogramsResponseSchema } from '../../../../common/api_schemas/field_histograms';

import type { EsIndex } from '../../../../common/types/es_index';

import type { SavedSearchQuery } from '../use_search_items';

export interface FieldHistogramRequestConfig {
  fieldName: string;
  type?: KBN_FIELD_TYPES;
}

const apiFactory = () => ({
  async getEsIndices(): Promise<EsIndex[] | IHttpFetchError> {
    return Promise.resolve([]);
  },
  async getHistogramsForFields(
    dataViewTitle: string,
    fields: FieldHistogramRequestConfig[],
    query: string | SavedSearchQuery,
    samplerShardSize = DEFAULT_SAMPLER_SHARD_SIZE
  ): Promise<FieldHistogramsResponseSchema | IHttpFetchError> {
    return Promise.resolve([]);
  },
});

export const useApi = () => {
  return apiFactory();
};
