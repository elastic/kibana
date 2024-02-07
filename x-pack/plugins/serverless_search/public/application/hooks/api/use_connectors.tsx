/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Connector } from '@kbn/search-connectors';
import { useQuery } from '@tanstack/react-query';
import { useKibanaServices } from '../use_kibana';

export const useConnectors = (from: number = 0, size: number = 10) => {
  const { http } = useKibanaServices();
  return useQuery({
    queryKey: ['fetchConnectors', from, size],
    queryFn: () =>
      http.fetch<{ connectors: Connector[] }>('/internal/serverless_search/connectors', {
        query: { from, size },
      }),
  });
};
