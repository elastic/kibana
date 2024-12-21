/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpSetup } from '@kbn/core/public';

export interface HttpValues {
  http: HttpSetup;
  httpInterceptors: Function[];
}

interface HttpActions {
  initializeHttpInterceptors(): void;
  onConnectionError(errorConnectingMessage: string): { errorConnectingMessage: string };
  setHttpInterceptors(httpInterceptors: Function[]): { httpInterceptors: Function[] };
}

export const HttpLogic = kea<MakeLogicType<HttpValues, HttpActions>>({
  actions: {
    initializeHttpInterceptors: () => null,
    setHttpInterceptors: (httpInterceptors) => ({ httpInterceptors }),
  },
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
  listeners: ({ actions }) => ({
    initializeHttpInterceptors: () => {
      const httpInterceptors: Function[] = [];
      actions.setHttpInterceptors(httpInterceptors);
    },
  }),
  path: ['enterprise_search', 'http_logic'],
  reducers: ({ props }) => ({
    http: [props.http, {}],
    httpInterceptors: [
      [],
      {
        setHttpInterceptors: (
          _: Function[],
          { httpInterceptors }: { httpInterceptors: Function[] }
        ) => httpInterceptors,
      },
    ],
  }),
});

/**
 * Mount/props helper
 */
interface HttpLogicProps {
  http: HttpSetup;
}

export const mountHttpLogic = (props: HttpLogicProps) => {
  HttpLogic(props);
  return HttpLogic.mount();
};
