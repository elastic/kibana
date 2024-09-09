/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { IngestGetPipelineResponse } from '@elastic/elasticsearch/lib/api/types';
import { useKibanaServices } from '../use_kibana';

export const useIngestPipelines = () => {
  const { http } = useKibanaServices();
  return useQuery({
    queryKey: ['fetchIngestPipelines'],
    queryFn: async () =>
      http.fetch<Record<string, IngestGetPipelineResponse>>(
        `/internal/serverless_search/ingest_pipelines`
      ),
  });
};
