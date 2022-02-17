/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { Breadcrumb } from '../app/breadcrumb';
import { TraceLink } from '../app/trace_link';
import { TransactionLink } from '../app/transaction_link';
import { home } from './home';
import { serviceDetail } from './service_detail';
import { settings } from './settings';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const apmRoutes = {
  '/link-to/transaction/{transactionId}': {
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
  '/link-to/trace/{traceId}': {
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
  '/': {
    element: (
      <Breadcrumb title="APM" href="/">
        <Outlet />
      </Breadcrumb>
    ),
    children: {
      ...settings,
      ...serviceDetail,
      ...home,
    },
  },
};

export type ApmRoutes = typeof apmRoutes;

export const apmRouter = createRouter(apmRoutes);

export type ApmRouter = typeof apmRouter;
