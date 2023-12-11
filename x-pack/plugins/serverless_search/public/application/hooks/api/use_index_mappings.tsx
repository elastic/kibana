/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import { useQuery } from '@tanstack/react-query';
import { useKibanaServices } from '../use_kibana';

export const useIndexMappings = (indexName: string) => {
  const { http } = useKibanaServices();
  return useQuery({
    queryKey: ['fetchIndexMappings'],
    queryFn: async () =>
      http.fetch<IndicesGetMappingIndexMappingRecord>(
        `/internal/serverless_search/mappings/${indexName}`
      ),
  });
};
