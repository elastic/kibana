/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { GlobalTimeArgs } from '../../../../common/containers/use_global_time';

export interface UseInspectButtonParams extends Pick<GlobalTimeArgs, 'setQuery' | 'deleteQuery'> {
  response: string;
  request: string;
  refetch: (() => void) | null;
  uniqueQueryId: string;
  loading: boolean;
}
/**
 * * Add query to inspect button utility.
 * * Delete query from inspect button utility when component unmounts
 */
export const useInspectButton = ({
  setQuery,
  response,
  request,
  refetch,
  uniqueQueryId,
  deleteQuery,
  loading,
}: UseInspectButtonParams) => {
  useEffect(() => {
    if (refetch != null && setQuery != null) {
      setQuery({
        id: uniqueQueryId,
        inspect: {
          dsl: [request],
          response: [response],
        },
        loading,
        refetch,
      });
    }

    return () => {
      if (deleteQuery) {
        deleteQuery({ id: uniqueQueryId });
      }
    };
  }, [setQuery, loading, response, request, refetch, uniqueQueryId, deleteQuery]);
};
