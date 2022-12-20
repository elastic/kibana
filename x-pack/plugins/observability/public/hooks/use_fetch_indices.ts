/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { useRef } from 'react';
import { useDataFetcher } from './use_data_fetcher';

export interface UseFetchIndicesResponse {
  indices: Index[];
  loading: boolean;
  error: boolean;
}

interface Index {
  health?: string;
  status?: string;
  name: string;
  uuid?: string;
  primary?: number | string;
  replica?: number | string;
  documents: number;
  documents_deleted: number;
  size: string;
  primary_size: string;
  isFrozen: boolean;
  hidden: boolean;
  aliases: string | string[];
  data_stream?: string;
  [key: string]: any;
}

export function useFetchIndices(): UseFetchIndicesResponse {
  const hasFetched = useRef<boolean>(false);

  const {
    data: indices,
    loading,
    error,
  } = useDataFetcher({
    paramsForApiCall: {},
    initialDataState: undefined,
    executeApiCall: async (
      _: any,
      abortController: AbortController,
      http: HttpSetup
    ): Promise<any> => {
      try {
        const response = await http.get<Index>(`/api/index_management/indices`, {
          signal: abortController.signal,
        });

        if (response !== undefined) {
          hasFetched.current = true;
          return response;
        }
      } catch (e) {
        // ignore error for retrieving slos
      }

      return;
    },
    shouldExecuteApiCall: () => (hasFetched.current === false ? true : false),
  });

  return { indices, loading, error };
}
