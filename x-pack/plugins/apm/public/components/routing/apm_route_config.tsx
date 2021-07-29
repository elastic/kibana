/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRouter, Outlet, route } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { Breadcrumb } from '../app/breadcrumb';
import { TraceLink } from '../app/TraceLink';
import { TransactionLink } from '../app/transaction_link';
import { home } from './home';
import { serviceDetail } from './service_detail';
import { settings } from './settings';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const apmRoutes = route([
  {
    path: '/',
    element: (
      <Breadcrumb title="APM" href="/">
        <Outlet />
      </Breadcrumb>
    ),
    children: [settings, serviceDetail, home],
  },
  {
    path: '/link-to/transaction/:transactionId',
    element: <TransactionLink />,
    params: t.intersection([
      t.type({
        path: t.type({
          transactionId: t.string,
        }),
      }),
      t.partial({
        query: t.partial({
          rangeFrom: t.string,
          rangeTo: t.string,
        }),
      }),
    ]),
  },
  {
    path: '/link-to/trace/:traceId',
    element: <TraceLink />,
    params: t.intersection([
      t.type({
        path: t.type({
          traceId: t.string,
        }),
      }),
      t.partial({
        query: t.partial({
          rangeFrom: t.string,
          rangeTo: t.string,
        }),
      }),
    ]),
  },
] as const);

export type ApmRoutes = typeof apmRoutes;

export const apmRouter = createRouter(apmRoutes);

export type ApmRouter = typeof apmRouter;
