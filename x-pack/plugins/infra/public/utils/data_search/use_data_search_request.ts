/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { OperatorFunction, ReplaySubject } from 'rxjs';
import { share, tap } from 'rxjs/operators';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '@kbn/data-plugin/public';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { tapUnsubscribe, useObservable } from '../use_observable';
import { ParsedDataSearchRequestDescriptor, ParsedKibanaSearchResponse } from './types';

export type DataSearchRequestFactory<Args extends any[], Request extends IKibanaSearchRequest> = (
  ...args: Args
) =>
  | {
      request: Request;
      options: ISearchOptions;
    }
  | null
  | undefined;

type ParseResponsesOperator<RawResponse, Response> = OperatorFunction<
  IKibanaSearchResponse<RawResponse>,
  ParsedKibanaSearchResponse<Response>
>;

export const useDataSearch = <
  RequestFactoryArgs extends any[],
  RequestParams,
  Request extends IKibanaSearchRequest<RequestParams>,
  RawResponse,
  Response
>({
  getRequest,
  parseResponses,
}: {
  getRequest: DataSearchRequestFactory<RequestFactoryArgs, Request>;
  parseResponses: ParseResponsesOperator<RawResponse, Response>;
}) => {
  const { services } = useKibanaContextForPlugin();
  const requests$ = useObservable(
    () => new ReplaySubject<ParsedDataSearchRequestDescriptor<Request, Response>>(1),
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
            parseResponses,
            share()
          ),
      };

      requests$.next(newRequestDescriptor);

      return newRequestDescriptor;
    },
    [getRequest, services.data.search, parseResponses, requests$]
  );

  return {
    requests$,
    search,
  };
};
