/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { InvestigatePageTemplate } from '../components/investigate_page_template';
import { InvestigateView } from '../components/investigate_view';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const investigateRoutes = {
  '/': {
    element: (
      <InvestigatePageTemplate>
        <Outlet />
      </InvestigatePageTemplate>
    ),
    children: {
      '/new': {
        element: <InvestigateView />,
        params: t.partial({
          query: t.partial({
            revision: t.string,
          }),
        }),
      },
      '/{id}': {
        element: <InvestigateView />,
        params: t.intersection([
          t.type({
            path: t.type({ id: t.string }),
          }),
          t.partial({
            query: t.partial({
              revision: t.string,
            }),
          }),
        ]),
      },
      '/': {
        element: <Redirect to="/new" />,
      },
    },
  },
};

export type InvestigateRoutes = typeof investigateRoutes;

export const investigateRouter = createRouter(investigateRoutes);

export type InvestigateRouter = typeof investigateRouter;
