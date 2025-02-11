/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isPromise } from '@kbn/std';
import { useEffect, useMemo, useRef, useState } from 'react';

interface State<T> {
  error?: Error;
  value?: T;
  loading: boolean;
}

export type AbortableAsyncState<T> = (T extends Promise<infer TReturn>
  ? State<TReturn>
  : State<T>) & { refresh: () => void };

export type AbortableAsyncStateOf<T extends AbortableAsyncState<any>> =
  T extends AbortableAsyncState<infer TResponse> ? Awaited<TResponse> : never;

interface UseAbortableAsyncOptions<T> {
  clearValueOnNext?: boolean;
  unsetValueOnError?: boolean;
  defaultValue?: () => T;
  onError?: (error: Error) => void;
}

export type UseAbortableAsync<
  TAdditionalParameters extends Record<string, any> = {},
  TAdditionalOptions extends Record<string, any> = {}
> = <T>(
  fn: ({}: { signal: AbortSignal } & TAdditionalParameters) => T | Promise<T>,
  deps: any[],
  options?: UseAbortableAsyncOptions<T> & TAdditionalOptions
) => AbortableAsyncState<T>;

export function useAbortableAsync<T>(
  fn: ({}: { signal: AbortSignal }) => T | Promise<T>,
  deps: any[],
  options?: UseAbortableAsyncOptions<T>
): AbortableAsyncState<T> {
  const clearValueOnNext = options?.clearValueOnNext;
  const unsetValueOnError = options?.unsetValueOnError;

  const controllerRef = useRef(new AbortController());

  const [refreshId, setRefreshId] = useState(0);

  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<T | undefined>(options?.defaultValue);

  useEffect(() => {
    controllerRef.current.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    function isRequestStale() {
      return controllerRef.current !== controller;
    }

    if (clearValueOnNext) {
      setValue(undefined);
      setError(undefined);
    }

    function handleError(err: Error) {
      if (isRequestStale()) return;
      setError(err);
      if (unsetValueOnError) {
        setValue(undefined);
      }
      setLoading(false);
      options?.onError?.(err);
    }

    try {
      const response = fn({ signal: controller.signal });
      if (isPromise(response)) {
        setLoading(true);
        response
          .then((nextValue) => {
            if (isRequestStale()) return;
            setError(undefined);
            setValue(nextValue);
          })
          .catch(handleError)
          .finally(() => {
            if (isRequestStale()) return;
            setLoading(false);
          });
      } else {
        setError(undefined);
        setValue(response);
        setLoading(false);
      }
    } catch (err) {
      handleError(err);
    }

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps.concat(refreshId, clearValueOnNext));

  return useMemo<AbortableAsyncState<T>>(() => {
    return {
      error,
      loading,
      value,
      refresh: () => {
        setRefreshId((id) => id + 1);
      },
    } as unknown as AbortableAsyncState<T>;
  }, [error, value, loading]);
}
