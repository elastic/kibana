/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { API_VERSIONS } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { PACKS_ID } from './constants';
import type { PackSavedObject } from './types';

export interface UsePacksResponse {
  total: number;
  data: PackSavedObject[];
}

export const usePacks = ({
  isLive = false,
  pageIndex = 0,
  pageSize = 100,
  sortField = 'updated_at',
  sortOrder = 'desc',
}) => {
  const { http } = useKibana().services;

  return useQuery<UsePacksResponse>(
    [PACKS_ID, { pageIndex, pageSize, sortField, sortOrder }],
    () =>
      http.get('/api/osquery/packs', {
        version: API_VERSIONS.public.v1,
        query: { pageIndex, pageSize, sortField, sortOrder },
      }),
    {
      keepPreviousData: true,
      // Refetch the data every 10 seconds
      refetchInterval: isLive ? 10000 : false,
    }
  );
};
