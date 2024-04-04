/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { customLogsRoutes } from '../components/app/custom_logs';
import { systemLogsRoutes } from '../components/app/system_logs';
import { Home } from '../components/app/home';

export type RouteParams<T extends keyof typeof routes> = DecodeParams<
  typeof routes[T]['params']
>;

type DecodeParams<TParams extends Params | undefined> = {
  [key in keyof TParams]: TParams[key] extends t.Any
    ? t.TypeOf<TParams[key]>
    : never;
};

export interface Params {
  query?: t.HasProps;
  path?: t.HasProps;
}

export const baseRoutes = {
  '/': {
    handler: () => <Home />,
    params: {},
    exact: true,
  },
  '/overview': {
    handler: () => <Redirect to="/" />,
    params: {},
    exact: true,
  },
};

export const routes = {
  ...baseRoutes,
  ...customLogsRoutes,
  ...systemLogsRoutes,
};
