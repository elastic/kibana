/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea } from 'kea';

import { HttpSetup } from 'src/core/public';

import { IKeaLogic, IKeaParams, TKeaReducers } from '../../shared/types';

export interface IHttpLogicValues {
  http: HttpSetup;
  httpInterceptors: Function[];
  errorConnecting: boolean;
}
export interface IHttpLogicActions {
  initializeHttp({ http, errorConnecting }: { http: HttpSetup; errorConnecting?: boolean }): void;
  initializeHttpInterceptors(): void;
  setHttpInterceptors(httpInterceptors: Function[]): void;
  setErrorConnecting(errorConnecting: boolean): void;
}

export const HttpLogic = kea({
  actions: (): IHttpLogicActions => ({
    initializeHttp: ({ http, errorConnecting }) => ({ http, errorConnecting }),
    initializeHttpInterceptors: () => null,
    setHttpInterceptors: (httpInterceptors) => ({ httpInterceptors }),
    setErrorConnecting: (errorConnecting) => ({ errorConnecting }),
  }),
  reducers: (): TKeaReducers<IHttpLogicValues, IHttpLogicActions> => ({
    http: [
      (null as unknown) as HttpSetup,
      {
        initializeHttp: (_, { http }) => http,
      },
    ],
    httpInterceptors: [
      [],
      {
        setHttpInterceptors: (_, { httpInterceptors }) => httpInterceptors,
      },
    ],
    errorConnecting: [
      false,
      {
        initializeHttp: (_, { errorConnecting }) => !!errorConnecting,
        setErrorConnecting: (_, { errorConnecting }) => errorConnecting,
      },
    ],
  }),
  listeners: ({ values, actions }) => ({
    initializeHttpInterceptors: () => {
      const httpInterceptors = [];

      const errorConnectingInterceptor = values.http.intercept({
        responseError: async (httpResponse) => {
          const { url, status } = httpResponse.response!;
          const hasErrorConnecting = status === 502;
          const isApiResponse =
            url.includes('/api/app_search/') || url.includes('/api/workplace_search/');

          if (isApiResponse && hasErrorConnecting) {
            actions.setErrorConnecting(true);
          }
          return httpResponse;
        },
      });
      httpInterceptors.push(errorConnectingInterceptor);

      // TODO: Read only mode interceptor
      actions.setHttpInterceptors(httpInterceptors);
    },
  }),
  events: ({ values }) => ({
    beforeUnmount: () => {
      values.httpInterceptors.forEach((removeInterceptorFn?: Function) => {
        if (removeInterceptorFn) removeInterceptorFn();
      });
    },
  }),
} as IKeaParams<IHttpLogicValues, IHttpLogicActions>) as IKeaLogic<
  IHttpLogicValues,
  IHttpLogicActions
>;
