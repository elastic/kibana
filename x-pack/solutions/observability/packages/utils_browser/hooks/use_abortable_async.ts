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

interface State<T> {
  error?: Error;
  value?: T;
  loading: boolean;
  generation: number;
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

  const [internalState, setInternalState] = useState<State<T>>(() => ({
    error: undefined,
    loading: false,
    value: options?.defaultValue ? options.defaultValue() : undefined,
    generation: 0,
  }));

  function updateState(newState: Partial<Omit<State<T>, 'generation'>> & { generation: number }) {
    setInternalState((currentState) => {
      if (currentState.generation === newState.generation) {
        return {
          ...currentState,
          ...newState,
        };
      }
      return currentState;
    });
  }

  /**
   * Start a new generation to track the current request.
   * All state updates from old requests will be ignored if the generation changes.
   */
  function startNewGeneration() {
    const newGeneration = Math.random();
    setInternalState((currentState) => {
      return {
        ...currentState,
        generation: newGeneration,
      };
    });
    return newGeneration;
  }

  useEffect(() => {
    controllerRef.current.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    const currentGeneration = startNewGeneration();

    if (clearValueOnNext) {
      updateState({
        value: undefined,
        error: undefined,
        generation: currentGeneration,
      });
    }

    function handleError(err: Error) {
      updateState({
        error: err,
        loading: false,
        ...(!unsetValueOnError && { value: undefined }),
        generation: currentGeneration,
      });
      options?.onError?.(err);
    }

    try {
      const response = fn({ signal: controller.signal });
      if (isPromise(response)) {
        updateState({
          loading: true,
          generation: currentGeneration,
        });
        response
          .then((nextValue) => {
            updateState({
              value: nextValue,
              error: undefined,
              generation: currentGeneration,
            });
          })
          .catch(handleError)
          .finally(() => {
            updateState({
              loading: false,
              generation: currentGeneration,
            });
          });
      } else {
        updateState({
          loading: false,
          error: undefined,
          value: response,
          generation: currentGeneration,
        });
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
      error: internalState.error,
      loading: internalState.loading,
      value: internalState.value,
      refresh: () => {
        setRefreshId((id) => id + 1);
      },
    } as unknown as AbortableAsyncState<T>;
  }, [internalState.error, internalState.value, internalState.loading]);
}
