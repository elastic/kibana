/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { tap } from 'rxjs';
import { useAiopsAppContext } from './use_aiops_app_context';

export function useCancellableSearch() {
  const { data } = useAiopsAppContext();
  const abortController = useRef(new AbortController());
  const [isLoading, setIsFetching] = useState<boolean>(false);

  const runRequest = useCallback(
    <RequestBody extends IKibanaSearchRequest, ResponseType extends IKibanaSearchResponse>(
      requestBody: RequestBody
    ): Promise<ResponseType | null> => {
      return new Promise((resolve, reject) => {
        data.search
          .search<RequestBody, ResponseType>(requestBody, {
            abortSignal: abortController.current.signal,
          })
          .pipe(
            tap(() => {
              setIsFetching(true);
            })
          )
          .subscribe({
            next: (result) => {
              if (!isRunningResponse(result)) {
                setIsFetching(false);
                resolve(result);
              } else {
                // partial results
                // Ignore partial results for now.
                // An issue with the search function means partial results are not being returned correctly.
              }
            },
            error: (error) => {
              if (error.name === 'AbortError') {
                return resolve(null);
              }
              setIsFetching(false);
              reject(error);
            },
          });
      });
    },
    [data.search]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return { runRequest, cancelRequest, isLoading };
}
