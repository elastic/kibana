/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { Annotation } from '../../../../common/annotations';
import { useKibana } from '../../../utils/kibana_react';

export function useFetchAnnotations({
  start,
  end,
  sloId,
  sloInstanceId,
}: {
  start: string;
  end: string;
  sloId?: string;
  sloInstanceId?: string;
}) {
  const { http } = useKibana().services;

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: ['fetchAnnotationList', start, end, sloId, sloInstanceId],
    queryFn: async ({}) => {
      return await http.get<Annotation[]>('/api/observability/annotations/find', {
        query: {
          start,
          end,
          sloId,
          sloInstanceId,
        },
      });
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
