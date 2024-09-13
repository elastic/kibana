/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibanaServices } from '../use_kibana';

export const useIndexNameSearch = (query: string) => {
  const { http } = useKibanaServices();
  return useQuery({
    queryKey: ['fetchIndexNames', query],
    queryFn: async () =>
      http.fetch<{ index_names: string[] }>('/internal/serverless_search/index_names', {
        query: { query },
      }),
  });
};
