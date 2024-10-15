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
import { useHttp } from '../../../../common/lib/kibana';

export const useFetchGraphData = (req: GraphRequest, options?: { enabled?: boolean }) => {
  const { actorIds, eventIds, start, end } = req.query;
  const http = useHttp();

  const { isLoading, isError, data } = useQuery<GraphResponse>(
    ['useFetchGraphData', actorIds, eventIds, start, end],
    () => {
      return http.post<GraphResponse>('/internal/cloud_security_posture/graph', {
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
