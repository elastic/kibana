/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { findListItems } from '@kbn/securitysolution-list-api';
import { useCursor } from '@kbn/securitysolution-list-hooks';
import { useKibana } from '../../../common/lib/kibana/kibana_react';

const FIND_LIST_ITEMS_QUERY_KEY = 'FIND_LIST_ITEMS';

export const useInvalidateListItemQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries([FIND_LIST_ITEMS_QUERY_KEY], {
      refetchType: 'active',
    });
  }, [queryClient]);
};

export const useFindListItems = ({
  pageIndex,
  pageSize,
  sortField,
  sortOrder,
  listId,
  filter,
}: {
  pageIndex: number;
  pageSize: number;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  listId: string;
  filter: string;
}) => {
  const [cursor, setCursor] = useCursor({ pageIndex, pageSize });
  const http = useKibana().services.http;
  return useQuery(
    [FIND_LIST_ITEMS_QUERY_KEY, pageIndex, pageSize, sortField, sortOrder, listId, filter],
    async ({ signal }) => {
      const response = await findListItems({
        http,
        signal,
        pageIndex,
        pageSize,
        sortField,
        sortOrder,
        listId,
        cursor,
        filter,
      });
      return response;
    },
    {
      keepPreviousData: true,
      onSuccess: (data) => {
        if (data?.cursor) {
          setCursor(data?.cursor);
        }
      },
    }
  );
};
