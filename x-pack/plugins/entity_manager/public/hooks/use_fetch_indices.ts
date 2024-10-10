/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from './use_kibana';

export function useFetchIndices({ indexPatterns }: { indexPatterns: string[] }) {
  const { dataViews } = useKibana().services;

  return useQuery({
    queryKey: ['getIndices', ...indexPatterns],
    queryFn: async () => {
      const searchPattern = indexPatterns.join(',');
      const response = await dataViews.getIndices({
        pattern: searchPattern,
        isRollupIndex: () => true,
      });
      return response;
    },
    retry: false,
    enabled: Boolean(indexPatterns.join(',')),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
}
