/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useRef } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';

// Params can be generalized to a ...rest parameter extending unknown[] once https://github.com/microsoft/TypeScript/pull/39094 is available.
// for now, the task must still receive unknown as a second argument, and an argument must be passed to start()
export type UseAsyncTask = <Result, Params extends unknown>(
  task: (...args: [AbortController, Params]) => Promise<Result>
) => AsyncTask<Result, Params>;

export interface AsyncTask<Result, Params extends unknown> {
  start: (params: Params) => void;
  abort: () => void;
  loading: boolean;
  error: Error | undefined;
  result: Result | undefined;
}

/**
 *
 * @param task Async function receiving an AbortController and optional arguments
 *
 * @returns An {@link AsyncTask} containing the underlying task's state along with start/abort helpers
 */
export const useAsyncTask: UseAsyncTask = (task) => {
  const ctrl = useRef(new AbortController());
  const abort = useCallback((): void => {
    ctrl.current.abort();
  }, []);

  // @ts-expect-error typings are incorrect, see: https://github.com/streamich/react-use/pull/589
  const [state, initiator] = useAsyncFn(task, [task]);

  const start = useCallback(
    (args) => {
      ctrl.current = new AbortController();
      initiator(ctrl.current, args);
    },
    [initiator]
  );

  return { abort, error: state.error, loading: state.loading, result: state.value, start };
};
