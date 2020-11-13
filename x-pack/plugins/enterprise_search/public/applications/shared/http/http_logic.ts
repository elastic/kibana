/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpSetup, HttpInterceptorResponseError, HttpResponse } from 'src/core/public';

import { READ_ONLY_MODE_HEADER } from '../../../../common/constants';

interface HttpValues {
  http: HttpSetup;
  httpInterceptors: Function[];
  errorConnecting: boolean;
  readOnlyMode: boolean;
}
interface HttpActions {
  initializeHttpInterceptors(): void;
  setHttpInterceptors(httpInterceptors: Function[]): { httpInterceptors: Function[] };
  setErrorConnecting(errorConnecting: boolean): { errorConnecting: boolean };
  setReadOnlyMode(readOnlyMode: boolean): { readOnlyMode: boolean };
}

export const HttpLogic = kea<MakeLogicType<HttpValues, HttpActions>>({
  path: ['enterprise_search', 'http_logic'],
  actions: {
    initializeHttpInterceptors: () => null,
    setHttpInterceptors: (httpInterceptors) => ({ httpInterceptors }),
    setErrorConnecting: (errorConnecting) => ({ errorConnecting }),
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
    errorConnecting: [
      props.errorConnecting || false,
      {
        setErrorConnecting: (_, { errorConnecting }) => errorConnecting,
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
            const { status } = httpResponse.response!;
            const hasErrorConnecting = status === 502;

            if (hasErrorConnecting) {
              actions.setErrorConnecting(true);
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
  errorConnecting?: boolean;
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
  const { url } = httpResponse.response!;
  return url.includes('/api/app_search/') || url.includes('/api/workplace_search/');
};
