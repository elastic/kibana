/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { DETECTION_ENGINE_TAGS_URL } from '../../../../../common/constants';
import type { FetchTagsResponse } from '../api';
import { fetchTags } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';

const TAGS_QUERY_KEY = ['GET', DETECTION_ENGINE_TAGS_URL];

/**
 * Hook for using the list of Tags from the Detection Engine API
 *
 */
export const useFetchTagsQuery = (options?: UseQueryOptions<FetchTagsResponse>) => {
  return useQuery<FetchTagsResponse>(
    TAGS_QUERY_KEY,
    async ({ signal }) => {
      return fetchTags({ signal });
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
    }
  );
};

export const useInvalidateFetchTagsQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(TAGS_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
