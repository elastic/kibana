/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTrackHttpRequest } from '../../lib/apm/use_track_http_request';
import type { QueryName } from './query_names';

interface ResultState<Response> {
  data?: Response;
  isLoading: boolean;
  error?: unknown;
}

interface Result<Request, Response> extends ResultState<Response> {
  query: (request: Request) => void;
}

type QueryFnParam<Request, Response> = (
  request: Request,
  signal: AbortController['signal']
) => Promise<Response>;

interface OptionsParam<Request> {
  disabled?: boolean;
  initialRequest?: Request;
}

export const useQuery = <Request, Response>(
  queryName: QueryName,
  queryFn: QueryFnParam<Request, Response>,
  { disabled = false, initialRequest }: OptionsParam<Request> = {}
): Result<Request, Response> => {
  const [request, setRequest] = useState<Request | undefined>(initialRequest);
  const [result, setResult] = useState<ResultState<Response>>({
    data: undefined,
    isLoading: false,
    error: undefined,
  });
  const { startTracking } = useTrackHttpRequest();

  const query = useCallback((req: Request) => {
    setRequest(req);
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    const asyncQuery = async () => {
      if (request == null || disabled) {
        return;
      }
      setResult((current) => ({ ...current, isLoading: true, error: undefined }));
      const { endTracking } = startTracking({ name: queryName });
      try {
        const data = await queryFn(request, abortController.signal);
        endTracking('success');
        if (!abortController.signal.aborted) {
          setResult({ data, isLoading: false });
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          endTracking('aborted');
          setResult((current) => ({ ...current, isLoading: false }));
        } else {
          endTracking('error');
          setResult((current) => ({ ...current, isLoading: false, error }));
        }
      }
    };

    asyncQuery();

    return () => {
      abortController.abort();
    };
  }, [disabled, request, queryFn, startTracking, queryName]);

  return { query, ...result };
};
