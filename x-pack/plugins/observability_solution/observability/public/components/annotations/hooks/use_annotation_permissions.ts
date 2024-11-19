/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../../utils/kibana_react';

export interface AnnotationsPermissions {
  read: boolean;
  write: boolean;
  index: string;
  hasGoldLicense: boolean;
}

export function useAnnotationPermissions() {
  const { http } = useKibana().services;

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: ['fetchAnnotationPermissions'],
    queryFn: async ({}) => {
      return await http.get<AnnotationsPermissions>('/api/observability/annotation/permissions');
    },
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    data,
    isLoading,
    isSuccess,
    isError,
    refetch,
  };
}
