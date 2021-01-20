/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { Subject } from 'rxjs';
import { share, tap } from 'rxjs/operators';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '../../../../../../src/plugins/data/public';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { tapUnsubscribe, useObservable } from '../use_observable';
import { DataSearchRequestDescriptor } from './types';

export type DataSearchRequestFactory<Args extends any[], Request extends IKibanaSearchRequest> = (
  ...args: Args
) =>
  | {
      request: Request;
      options: ISearchOptions;
    }
  | null
  | undefined;

export const useDataSearch = <
  RequestFactoryArgs extends any[],
  Request extends IKibanaSearchRequest,
  RawResponse
>({
  getRequest,
}: {
  getRequest: DataSearchRequestFactory<RequestFactoryArgs, Request>;
}) => {
  const { services } = useKibanaContextForPlugin();
  const requests$ = useObservable(
    () => new Subject<DataSearchRequestDescriptor<Request, RawResponse>>(),
    []
  );

  const search = useCallback(
    (...args: RequestFactoryArgs) => {
      const requestArgs = getRequest(...args);

      if (requestArgs == null) {
        return;
      }

      const abortController = new AbortController();
      let isAbortable = true;

      const newRequestDescriptor = {
        ...requestArgs,
        abortController,
        response$: services.data.search
          .search<Request, IKibanaSearchResponse<RawResponse>>(requestArgs.request, {
            abortSignal: abortController.signal,
            ...requestArgs.options,
          })
          .pipe(
            // avoid aborting failed or completed requests
            tap({
              error: () => {
                isAbortable = false;
              },
              complete: () => {
                isAbortable = false;
              },
            }),
            tapUnsubscribe(() => {
              if (isAbortable) {
                abortController.abort();
              }
            }),
            share()
          ),
      };

      requests$.next(newRequestDescriptor);

      return newRequestDescriptor;
    },
    [getRequest, services.data.search, requests$]
  );

  return {
    requests$,
    search,
  };
};
