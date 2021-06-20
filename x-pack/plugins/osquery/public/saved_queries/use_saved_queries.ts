/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { useKibana } from '../common/lib/kibana';
import { savedQuerySavedObjectType } from '../../common/types';

export const SAVED_QUERIES_ID = 'savedQueryList';

export const useSavedQueries = ({
  isLive = false,
  pageIndex = 0,
  pageSize = 10000,
  sortField = 'updated_at',
  sortDirection = 'desc',
}) => {
  const { savedObjects } = useKibana().services;

  return useQuery(
    [SAVED_QUERIES_ID, { pageIndex, pageSize, sortField, sortDirection }],
    async () => {
      return savedObjects.client.find({
        type: savedQuerySavedObjectType,
        page: pageIndex + 1,
        perPage: pageSize,
        sortField,
      });
    },
    {
      keepPreviousData: true,
      // Refetch the data every 10 seconds
      refetchInterval: isLive ? 10000 : false,
    }
  );
};
