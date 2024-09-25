/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { toNumberRt } from '@kbn/io-ts-utils';
import { Outlet, createRouter } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { ENTITY_LAST_SEEN } from '../../common/es_fields/entities';
import { InventoryPageTemplate } from '../components/inventory_page_template';
import { InventoryPage } from '../pages/inventory_page';
import { entityTypesRt } from '../../common/entities';

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
          sortField: t.string,
          sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
          pageIndex: toNumberRt,
        }),
        t.partial({
          entityTypes: entityTypesRt,
          kuery: t.string,
        }),
      ]),
    }),
    defaults: {
      query: {
        sortField: ENTITY_LAST_SEEN,
        sortDirection: 'desc',
        pageIndex: '0',
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
