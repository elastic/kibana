/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useRef } from 'react';
import { useAsyncFn } from 'react-use';

export interface AsyncTask<Result, Params extends unknown> {
  start: (params: Params) => Promise<Result>;
  abort: () => void;
  loading: boolean;
  error: Error | undefined;
  result: Result | undefined;
}

export type UseAsyncTask = <Result, Params extends unknown>(
  func: (...args: [AbortController, Params]) => Promise<Result>
) => AsyncTask<Result, Params>;

export const useAsyncTask: UseAsyncTask = (fn) => {
  const ctrl = useRef(new AbortController());
  const abort = useCallback((): void => {
    ctrl.current.abort();
  }, []);

  // @ts-ignore typings are incorrect, see: https://github.com/streamich/react-use/pull/589
  const [state, initiator] = useAsyncFn(fn, [fn]);

  const start = useCallback(
    (args) => {
      ctrl.current = new AbortController();

      return initiator(ctrl.current, args).then((result) =>
        // convert resolved error to rejection: https://github.com/streamich/react-use/issues/981
        result instanceof Error ? Promise.reject(result) : result
      );
    },
    [initiator]
  );

  return { abort, error: state.error, loading: state.loading, result: state.value, start };
};
