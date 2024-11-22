/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type {
  GraphRequest,
  GraphResponse,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import { useMemo } from 'react';
import { EVENT_GRAPH_VISUALIZATION_API } from '../../../../../common/constants';
import { useHttp } from '../../../../common/lib/kibana';

/**
 * Interface for the input parameters of the useFetchGraphData hook.
 */
export interface UseFetchGraphDataParams {
  /**
   * The request object containing the query parameters for the graph data.
   */
  req: GraphRequest;
  /**
   * Optional configuration options for the query.
   */
  options?: {
    /**
     * If false, the query will not automatically run.
     * Defaults to true.
     */
    enabled?: boolean;
    /**
     * If true, the query will refetch on window focus.
     * Defaults to true.
     */
    refetchOnWindowFocus?: boolean;
  };
}

/**
 * Interface for the result of the useFetchGraphData hook.
 */
export interface UseFetchGraphDataResult {
  /**
   * Indicates if the query is currently loading.
   */
  isLoading: boolean;
  /**
   * Indicates if there was an error during the query.
   */
  isError: boolean;
  /**
   * The data returned from the query.
   */
  data?: GraphResponse;
}

/**
 * Hook to fetch event's graph visualization data.
 *
 * @param params - The input parameters for the hook.
 * @returns The result of the hook.
 */
export const useFetchGraphData = ({
  req,
  options,
}: UseFetchGraphDataParams): UseFetchGraphDataResult => {
  const { eventIds, start, end, esQuery } = req.query;
  const http = useHttp();
  const QUERY_KEY = useMemo(
    () => ['useFetchGraphData', eventIds, start, end, esQuery],
    [end, esQuery, eventIds, start]
  );

  const { isLoading, isError, data } = useQuery<GraphResponse>(
    QUERY_KEY,
    () => {
      return http.post<GraphResponse>(EVENT_GRAPH_VISUALIZATION_API, {
        version: '1',
        body: JSON.stringify(req),
      });
    },
    {
      enabled: options?.enabled ?? true,
      refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
    }
  );

  return {
    isLoading,
    isError,
    data,
  };
};
