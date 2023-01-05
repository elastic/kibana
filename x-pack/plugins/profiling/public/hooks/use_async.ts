/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpFetchOptions, HttpHandler, HttpStart } from '@kbn/core-http-browser';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { useEffect, useRef, useState } from 'react';
import { Overwrite, ValuesType } from 'utility-types';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';

export enum AsyncStatus {
  Loading = 'loading',
  Init = 'init',
  Settled = 'settled',
}

export interface AsyncState<T> {
  data?: T;
  error?: Error;
  status: AsyncStatus;
}

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

export type UseAsync = <T>(
  fn: ({ http }: { http: AutoAbortedHttpService }) => Promise<T> | undefined,
  dependencies: any[]
) => AsyncState<T>;

export const useAsync: UseAsync = (fn, dependencies) => {
  const {
    start: {
      core: { http },
    },
  } = useProfilingDependencies();
  const [asyncState, setAsyncState] = useState<AsyncState<any>>({
    status: AsyncStatus.Init,
  });

  const { data, error } = asyncState;

  const controllerRef = useRef(new AbortController());

  useEffect(() => {
    controllerRef.current.abort();

    controllerRef.current = new AbortController();

    const autoAbortedMethods = {} as Record<HttpMethod, AutoAbortedHttpMethod>;

    for (const key of HTTP_METHODS) {
      autoAbortedMethods[key] = (path, options) => {
        return http[key](path, { ...options, signal: controllerRef.current.signal }).catch(
          (err) => {
            if (err.name === 'AbortError') {
              // return never-resolving promise
              return new Promise(() => {});
            }
            throw err;
          }
        );
      };
    }

    const returnValue = fn({ http: { ...http, ...autoAbortedMethods } });

    if (returnValue === undefined) {
      setAsyncState({
        status: AsyncStatus.Init,
        data: undefined,
        error: undefined,
      });
      return;
    }

    setAsyncState({
      status: AsyncStatus.Loading,
      data,
      error,
    });

    returnValue.then((nextData) => {
      setAsyncState({
        status: AsyncStatus.Settled,
        data: nextData,
      });
    });

    returnValue.catch((nextError) => {
      if (nextError instanceof AbortError) {
        return;
      }
      setAsyncState({
        status: AsyncStatus.Settled,
        error: nextError,
      });
      throw nextError;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, ...dependencies]);

  useEffect(() => {
    return () => {
      controllerRef.current.abort();
    };
  }, []);

  return asyncState;
};
