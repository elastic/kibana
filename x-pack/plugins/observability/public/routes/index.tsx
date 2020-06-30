/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import * as t from 'io-ts';
import { HomePage } from '../pages/home';
import { LandingPage } from '../pages/landing';
import { DashboardPage } from '../pages/dashboard';
import { jsonRt } from './json_rt';

export type RouteParams<T extends keyof typeof routes> = DecodeParams<typeof routes[T]['params']>;

type DecodeParams<TParams extends Params | undefined> = {
  [key in keyof TParams]: TParams[key] extends t.Any ? t.TypeOf<TParams[key]> : never;
};

export interface Params {
  query?: t.HasProps;
  path?: t.HasProps;
}
export const routes = {
  '/': {
    handler: () => {
      return <HomePage />;
    },
    params: {},
  },
  '/landing': {
    handler: () => {
      return <LandingPage />;
    },
    params: {},
  },
  '/dashboard': {
    handler: ({ query }: any) => {
      return <DashboardPage routeParams={{ query }} />;
    },
    params: {
      query: t.partial({
        rangeFrom: t.string,
        rangeTo: t.string,
        refreshPaused: jsonRt.pipe(t.boolean),
        refreshInterval: jsonRt.pipe(t.number),
      }),
    },
  },
};
