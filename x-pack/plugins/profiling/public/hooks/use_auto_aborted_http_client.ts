/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import { Overwrite, ValuesType } from 'utility-types';
import { HttpFetchOptions, HttpHandler, HttpStart } from '@kbn/core/public';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';

const HTTP_METHODS = ['fetch', 'get', 'post', 'put', 'delete', 'patch'] as const;

type HttpMethod = ValuesType<typeof HTTP_METHODS>;

type AutoAbortedHttpMethod = (
  path: string,
  options: Omit<HttpFetchOptions, 'signal'>
) => ReturnType<HttpHandler>;

export type AutoAbortedHttpService = Overwrite<
  HttpStart,
  Record<HttpMethod, AutoAbortedHttpMethod>
>;

export function useAutoAbortedHttpClient(dependencies: any[]): AutoAbortedHttpService {
  const controller = useRef(new AbortController());

  const {
    start: {
      core: { http },
    },
  } = useProfilingDependencies();

  const httpClient = useMemo(() => {
    controller.current.abort();

    controller.current = new AbortController();

    const autoAbortedMethods = {} as Record<HttpMethod, AutoAbortedHttpMethod>;

    for (const key of HTTP_METHODS) {
      autoAbortedMethods[key] = (path, options) => {
        return http[key](path, { ...options, signal: controller.current.signal }).catch((err) => {
          if (err.name === 'AbortError') {
            // return never-resolving promise
            return new Promise(() => {});
          }
          throw err;
        });
      };
    }

    return {
      ...http,
      ...autoAbortedMethods,
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, ...dependencies]);

  useEffect(() => {
    return () => {
      controller.current.abort();
    };
  }, []);

  return httpClient;
}
