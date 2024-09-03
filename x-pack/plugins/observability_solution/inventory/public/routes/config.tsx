/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import React from 'react';
import { InventoryPageTemplate } from '../components/inventory_page_template';
import { DatasetInventoryView } from '../components/dataset_inventory_view';
import { DatasetAnalysisView } from '../components/dataset_analysis_view';
import { DatasetOverview } from '../components/dataset_overview';
import { DatasetDetailView } from '../components/dataset_detail_view';
import { DatasetMetricsView } from '../components/dataset_metrics_view';
import { RedirectTo } from '../components/redirect_to';

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
    children: {
      '/updates': {
        element: <></>,
      },
      '/dataset/analyze': {
        element: <DatasetAnalysisView />,
        params: t.type({
          query: t.type({
            indexPatterns: t.string,
          }),
        }),
      },
      '/dataset': {
        element: <DatasetInventoryView />,
      },
      '/dataset/{name}': {
        params: t.type({
          path: t.type({
            name: t.string,
          }),
        }),
        element: (
          <DatasetDetailView>
            <Outlet />
          </DatasetDetailView>
        ),
        children: {
          '/dataset/{name}/overview': {
            element: <DatasetOverview />,
          },
          '/dataset/{name}/metrics': {
            element: <DatasetMetricsView />,
          },
          '/dataset/{name}': {
            element: <RedirectTo path="/dataset/{name}/overview" />,
          },
        },
      },
      '/{type}': {
        element: <></>,
        params: t.type({
          path: t.type({ type: t.string }),
        }),
      },
      '/': {
        element: <></>,
      },
    },
  },
};

export type InventoryRoutes = typeof inventoryRoutes;

export const inventoryRouter = createRouter(inventoryRoutes);

export type InventoryRouter = typeof inventoryRouter;
