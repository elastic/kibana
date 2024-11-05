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
  const { actorIds, eventIds, start, end } = req.query;
  const http = useHttp();

  const { isLoading, isError, data } = useQuery<GraphResponse>(
    ['useFetchGraphData', actorIds, eventIds, start, end],
    () => {
      return http.post<GraphResponse>(EVENT_GRAPH_VISUALIZATION_API, {
        version: '1',
        body: JSON.stringify(req),
      });
    },
    options
  );

  return {
    isLoading,
    isError,
    data,
  };
};
