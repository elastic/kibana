/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';

import { TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';
import type { EsIngestPipeline } from '../../../common/types/es_ingest_pipeline';

import { useAppDependencies } from '../app_dependencies';

export const useGetEsIngestPipelines = () => {
  const { http } = useAppDependencies();

  return useQuery<EsIngestPipeline[], IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_ES_INGEST_PIPELINES],
    ({ signal }) =>
      http.get<EsIngestPipeline[]>('/api/ingest_pipelines', {
        version: '1',
        signal,
      })
  );
};
