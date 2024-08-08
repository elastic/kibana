/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createRouter } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { InvestigateDetailsPage } from '../pages/details';
import { InvestigationListPage } from '../pages/list';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const investigateRoutes = {
  '/': {
    element: <InvestigationListPage />,
  },
  '/new': {
    element: <InvestigateDetailsPage />,
  },
  '/{id}': {
    element: <InvestigateDetailsPage />,
    params: t.type({
      path: t.type({ id: t.string }),
    }),
  },
};

export type InvestigateRoutes = typeof investigateRoutes;

export const investigateRouter = createRouter(investigateRoutes);

export type InvestigateRouter = typeof investigateRouter;
