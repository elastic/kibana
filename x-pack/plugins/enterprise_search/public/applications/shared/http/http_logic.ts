/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpSetup, HttpInterceptorResponseError, HttpResponse } from 'src/core/public';

import { ERROR_CONNECTING_HEADER, READ_ONLY_MODE_HEADER } from '../../../../common/constants';

export interface HttpValues {
  http: HttpSetup;
  httpInterceptors: Function[];
  errorConnectingMessage: string;
  readOnlyMode: boolean;
}

interface HttpActions {
  initializeHttpInterceptors(): void;
  onConnectionError(errorConnectingMessage: string): { errorConnectingMessage: string };
  setHttpInterceptors(httpInterceptors: Function[]): { httpInterceptors: Function[] };
  setReadOnlyMode(readOnlyMode: boolean): { readOnlyMode: boolean };
}

export const HttpLogic = kea<MakeLogicType<HttpValues, HttpActions>>({
  path: ['enterprise_search', 'http_logic'],
  actions: {
    initializeHttpInterceptors: () => null,
    onConnectionError: (errorConnectingMessage) => ({ errorConnectingMessage }),
    setHttpInterceptors: (httpInterceptors) => ({ httpInterceptors }),
    setReadOnlyMode: (readOnlyMode) => ({ readOnlyMode }),
  },
  reducers: ({ props }) => ({
    http: [props.http, {}],
    httpInterceptors: [
      [],
      {
        setHttpInterceptors: (_, { httpInterceptors }) => httpInterceptors,
      },
    ],
    errorConnectingMessage: [
      props.errorConnectingMessage || '',
      {
        onConnectionError: (_, { errorConnectingMessage }) => errorConnectingMessage,
      },
    ],
    readOnlyMode: [
      props.readOnlyMode || false,
      {
        setReadOnlyMode: (_, { readOnlyMode }) => readOnlyMode,
      },
    ],
  }),
  listeners: ({ values, actions }) => ({
    initializeHttpInterceptors: () => {
      const httpInterceptors = [];

      const errorConnectingInterceptor = values.http.intercept({
        responseError: async (httpResponse) => {
          if (isEnterpriseSearchApi(httpResponse)) {
            const hasErrorConnecting = httpResponse.response!.headers.get(ERROR_CONNECTING_HEADER);
            if (hasErrorConnecting === 'true') {
              const { status, statusText } = httpResponse.response!;
              actions.onConnectionError(`${status} ${statusText}`);
            }
          }

          // Re-throw error so that downstream catches work as expected
          return Promise.reject(httpResponse) as Promise<HttpInterceptorResponseError>;
        },
      });
      httpInterceptors.push(errorConnectingInterceptor);

      const readOnlyModeInterceptor = values.http.intercept({
        response: async (httpResponse) => {
          if (isEnterpriseSearchApi(httpResponse)) {
            const readOnlyMode = httpResponse.response!.headers.get(READ_ONLY_MODE_HEADER);

            if (readOnlyMode === 'true') {
              actions.setReadOnlyMode(true);
            } else {
              actions.setReadOnlyMode(false);
            }
          }

          return Promise.resolve(httpResponse);
        },
      });
      httpInterceptors.push(readOnlyModeInterceptor);

      actions.setHttpInterceptors(httpInterceptors);
    },
  }),
  events: ({ values, actions }) => ({
    afterMount: () => {
      actions.initializeHttpInterceptors();
    },
    beforeUnmount: () => {
      values.httpInterceptors.forEach((removeInterceptorFn?: Function) => {
        if (removeInterceptorFn) removeInterceptorFn();
      });
    },
  }),
});

/**
 * Mount/props helper
 */
interface HttpLogicProps {
  http: HttpSetup;
  errorConnectingMessage?: string;
  readOnlyMode?: boolean;
}
export const mountHttpLogic = (props: HttpLogicProps) => {
  HttpLogic(props);
  const unmount = HttpLogic.mount();
  return unmount;
};

/**
 * Small helper that checks whether or not an http call is for an Enterprise Search API
 */
const isEnterpriseSearchApi = (httpResponse: HttpResponse) => {
  if (!httpResponse.response) return false; // Typically this means Kibana has stopped working, in which case we short-circuit early to prevent errors

  const { url } = httpResponse.response;
  return url.includes('/internal/app_search/') || url.includes('/internal/workplace_search/');
};
