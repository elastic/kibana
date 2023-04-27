/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Home } from '../components/app/home';
import { CustomLogs } from '../components/app/custom_logs';

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

export const routes = {
  '/': {
    handler: () => {
      return <Home />;
    },
    params: {},
    exact: true,
  },
  '/overview': {
    handler: () => {
      return <Redirect to="/" />;
    },
    params: {},
    exact: true,
  },
  '/customLogs': {
    handler: () => {
      return <CustomLogs />;
    },
    params: {},
    exact: true,
  },
};
