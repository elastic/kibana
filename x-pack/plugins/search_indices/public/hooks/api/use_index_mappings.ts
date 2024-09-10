/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../use_kibana';
import { Mappings } from '../../types';

export const useIndexMapping = (indexName: string) => {
  const { http } = useKibana().services;
  const queryKey = ['fetchMapping', indexName];
  const result = useQuery({
    queryKey,
    refetchOnWindowFocus: 'always',
    queryFn: () =>
      http.fetch<Mappings>(`/api/index_management/mapping/${encodeURIComponent(indexName)}`),
  });
  return { queryKey, ...result };
};
