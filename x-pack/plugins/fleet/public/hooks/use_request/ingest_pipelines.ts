/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDataStreamsResponse } from '../../types';

import { useRequest } from './use_request';

export const useGetPipeline = (pipelineId: string) => {
  return useRequest<GetDataStreamsResponse>({
    path: `/api/ingest_pipelines/${pipelineId}`,
    method: 'get',
  });
};
