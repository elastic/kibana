/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { useKibana } from '../common/lib/kibana';
import { PACKS_ID } from './constants';

export const usePacks = ({
  isLive = false,
  pageIndex = 0,
  pageSize = 10000,
  sortField = 'updated_at',
  sortDirection = 'desc',
}) => {
  const { http } = useKibana().services;

  return useQuery(
    [PACKS_ID, { pageIndex, pageSize, sortField, sortDirection }],
    async () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      http.get<any>('/internal/osquery/packs', {
        query: { pageIndex, pageSize, sortField, sortDirection },
      }),
    {
      keepPreviousData: true,
      // Refetch the data every 10 seconds
      refetchInterval: isLive ? 10000 : false,
    }
  );
};
