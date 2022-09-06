/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTrackHttpRequest } from '../../lib/apm/use_track_http_request';
import type { QueryName } from './query_names';

type QueryFn<Request, Response> = (
  request: Request,
  options?: { signal?: AbortController['signal'] }
) => Promise<Response>;

interface ResultState<Response> {
  data?: Record<string, Response>;
  isLoading: boolean;
  error?: unknown;
}

interface Result<Request, Response> extends ResultState<Response> {
  query: (request: Request) => void;
}

export const useQueryBy = <Request, Response>(
  queryFn: QueryFn<Request, Response>,
  queryBy: string,
  queryName: QueryName,
  options: { disabled?: boolean } = {}
): Result<Request, Response> => {
  const { startTracking } = useTrackHttpRequest();

  const abortControllers$ = useRef<Record<string, AbortController>>({});

  const [request, setRequest] = useState<Request | null>(null);
  const [result, setResult] = useState<ResultState<Response>>({
    data: undefined,
    isLoading: false,
    error: undefined,
  });

  const { disabled = false } = useMemo(() => options, [options]);

  const query = useCallback((req: Request) => {
    setRequest(req);
  }, []);

  useEffect(() => {
    const asyncQuery = async () => {
      if (request === null || disabled) {
        return;
      }

      if (abortControllers$.current[queryBy]) {
        abortControllers$.current[queryBy].abort();
      }
      const abortController = new AbortController();
      abortControllers$.current[queryBy] = abortController;

      setResult((current) => ({ ...current, isLoading: true, error: undefined }));
      const { endTracking } = startTracking({ name: queryName });
      try {
        const data = await queryFn(request, { signal: abortController.signal });

        endTracking('success');
        if (!abortController.signal.aborted) {
          setResult((current) => ({
            data: { ...current.data, [queryBy]: data },
            isLoading: false,
          }));
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          endTracking('aborted');
          setResult((current) => ({ ...current, isLoading: false, error: undefined }));
        } else {
          endTracking('error');
          setResult((current) => ({ ...current, isLoading: false, error }));
        }
      } finally {
        delete abortControllers$.current[queryBy];
      }
    };

    asyncQuery();
  }, [disabled, request, queryFn, startTracking, queryName, queryBy]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(abortControllers$.current).forEach((abortController) =>
        abortController.abort()
      );
    };
  }, []);

  return { query, ...result };
};
