/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../src/plugins/data/public';
import type { SearchServiceParams } from '../../common/search_strategies/types';
import type { RawResponseBase } from '../../common/search_strategies/types';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { ApmSearchStrategies } from '../../common/search_strategies/constants';
import { ApmPluginStartDeps } from '../plugin';

interface SearchStrategyFetcherState {
  error?: Error;
  isComplete: boolean;
  isRunning: boolean;
  loaded: number;
  total: number;
}

export function useSearchStrategy<RawResponse extends RawResponseBase>(
  searchStrategyName: ApmSearchStrategies
) {
  const {
    services: { data },
  } = useKibana<ApmPluginStartDeps>();

  const [rawResponse, setRawResponse] = useState<RawResponse>({
    ccsWarning: false,
    took: 0,
  } as RawResponse);

  const [fetchState, setFetchState] = useState<SearchStrategyFetcherState>({
    isComplete: false,
    isRunning: false,
    loaded: 0,
    total: 100,
  });

  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();

  const startFetch = useCallback(
    (params: SearchServiceParams) => {
      setFetchState((prevState) => ({
        ...prevState,
        error: undefined,
        isComplete: false,
      }));
      searchSubscription$.current?.unsubscribe();
      abortCtrl.current.abort();
      abortCtrl.current = new AbortController();

      const req = { params };

      // Submit the search request using the `data.search` service.
      searchSubscription$.current = data.search
        .search<IKibanaSearchRequest, IKibanaSearchResponse<RawResponse>>(req, {
          strategy: searchStrategyName,
          abortSignal: abortCtrl.current.signal,
        })
        .subscribe({
          next: (res: IKibanaSearchResponse<RawResponse>) => {
            setRawResponse(res.rawResponse);
            setFetchState((prevState) => ({
              ...prevState,
              isRunning: res.isRunning || false,
              loaded: res.loaded!,
              total: res.total!,
            }));

            if (isCompleteResponse(res)) {
              searchSubscription$.current?.unsubscribe();
              setFetchState((prevState) => ({
                ...prevState,
                isRunnning: false,
                isComplete: true,
              }));
            } else if (isErrorResponse(res)) {
              searchSubscription$.current?.unsubscribe();
              setFetchState((prevState) => ({
                ...prevState,
                error: (res as unknown) as Error,
                isRunning: false,
              }));
            }
          },
          error: (error: Error) => {
            setFetchState((prevState) => ({
              ...prevState,
              error,
              isRunning: false,
            }));
          },
        });
    },
    [data.search, searchStrategyName, setFetchState, setRawResponse]
  );

  const cancelFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    searchSubscription$.current = undefined;
    abortCtrl.current.abort();
    setFetchState((prevState) => ({
      ...prevState,
      isRunning: false,
    }));
  }, [setFetchState]);

  return {
    fetchState,
    rawResponse,
    progress: fetchState.loaded / fetchState.total,
    startFetch,
    cancelFetch,
  };
}
