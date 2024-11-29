/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Outlet, createRouter } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { InventoryPageTemplate } from '../components/inventory_page_template';
import { InventoryPage } from '../pages/inventory_page';
import { defaultEntitySortField, entityColumnIdsRt, entityViewRt } from '../../common/entities';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const inventoryRoutes = {
  '/': {
    element: (
      <InventoryPageTemplate>
        <Outlet />
      </InventoryPageTemplate>
    ),
    params: t.type({
      query: t.intersection([
        t.type({
          sortField: entityColumnIdsRt,
          sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
        }),
        t.partial({
          view: entityViewRt,
          pagination: t.string,
          _a: t.string,
          controlPanels: t.string,
        }),
      ]),
    }),
    defaults: {
      query: {
        sortField: defaultEntitySortField,
        sortDirection: 'desc',
        view: 'grouped',
      },
    },
    children: {
      '/{type}': {
        element: <></>,
        params: t.type({
          path: t.type({ type: t.string }),
        }),
      },
      '/': {
        element: <InventoryPage />,
      },
    },
  },
};

export type InventoryRoutes = typeof inventoryRoutes;

export const inventoryRouter = createRouter(inventoryRoutes);

export type InventoryRouter = typeof inventoryRouter;
