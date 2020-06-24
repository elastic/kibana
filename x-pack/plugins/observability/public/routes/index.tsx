/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import * as t from 'io-ts';
import { Home } from '../pages/home';
import { Overview } from '../pages/overview';

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
      return <Home />;
    },
    params: {},
  },
  '/overview': {
    handler: ({ query }: any) => {
      return <Overview routeParams={{ query }} />;
    },
    params: {
      query: t.partial({
        rangeFrom: t.string,
        rangeTo: t.string,
      }),
    },
  },
};
