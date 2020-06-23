/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import * as t from 'io-ts';
import { Home } from '../pages/home';
import { Overview } from '../pages/overview';
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
      return <Home />;
    },
    params: {},
  },
  '/overview': {
    handler: ({ query }: { query: any }) => {
      console.log('### caue: query', query);
      return <Overview routeParams={{ query }} />;
    },
    params: {
      query: t.partial({
        rangeFrom: t.string,
        rangeTo: t.string,
      }),
    },
  },
  '/overview/:id': {
    handler: ({ query, path }: { query: any; path: any }) => {
      return <Overview />;
    },
    params: {
      path: t.type({ id: jsonRt.pipe(t.number) }),
      query: t.partial({
        rangeFrom: t.string,
        rangeTo: t.string,
      }),
    },
  },
};
