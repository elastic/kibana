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

// "/services/{serviceName}/errors": {
//   params: {
//     path: t.type({
//       serviceName: t.string
//     }),
// query: t.partial({
//   rangeFrom: t.string,
//   rangeTo: t.string
// })
//   },
//   handler: async ({ query, path }) => {
//     return <ErrorGroupDetails routeParams={{ query, path }} />;
//   }
// }

export interface Route {
  handler: React.ReactNode;
  params?: {
    path?: any;
    query?: any;
  };
}

export const routes: Record<string, Route> = {
  '/': {
    handler: () => {
      return <Home />;
    },
  },
  '/overview': {
    handler: ({ query, path }: { query: any; path: any }) => {
      console.log('### caue:', { query, path });
      return <Overview />;
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
      console.log('### caue: with ID query', { query, path });
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
