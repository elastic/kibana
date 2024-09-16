/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { createRouter, Outlet, RouteMap } from '@kbn/typed-react-router-config';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { InventoryPageTemplate } from '../components/inventory_page_template';
import { DatasetInventoryView } from '../components/dataset_inventory_view';
import { DatasetAnalysisView } from '../components/dataset_analysis_view';
import { DatasetOverview } from '../components/dataset_overview';
import { DatasetDetailView } from '../components/dataset_detail_view';
import { DatasetMetricsView } from '../components/dataset_metrics_view';
import { RedirectTo } from '../components/redirect_to';
import { AllInventoryView } from '../components/all_inventory_view';
import { DatasetManagementView } from '../components/dataset_management_view';
import { InventoryRouterBreadcrumb } from '../components/inventory_router_breadcrumb';
import { DatasetManagementSplitView } from '../components/dataset_management_split_view';
import { DefinitionsView } from '../components/definitions_view';
import { EntityDetailView } from '../components/entity_detail_view';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const inventoryRoutes = {
  '/': {
    element: (
      <InventoryRouterBreadcrumb
        title={i18n.translate('xpack.inventory.appBreadcrumbTitle', {
          defaultMessage: 'Entities',
        })}
        path="/"
      >
        <InventoryPageTemplate>
          <Outlet />
        </InventoryPageTemplate>
      </InventoryRouterBreadcrumb>
    ),
    children: {
      '/updates': {
        element: <></>,
      },
      '/definitions': {
        element: <DefinitionsView />,
      },
      '/all': {
        element: (
          <InventoryRouterBreadcrumb
            title={i18n.translate('xpack.inventory.allInventoryView.breadcrumbTitle', {
              defaultMessage: 'All',
            })}
            path="/all"
          >
            <AllInventoryView />
          </InventoryRouterBreadcrumb>
        ),
      },
      '/data_stream/analyze': {
        element: <DatasetAnalysisView />,
        params: t.type({
          query: t.type({
            indexPatterns: t.string,
          }),
        }),
      },
      '/data_stream': {
        element: (
          <InventoryRouterBreadcrumb
            title={i18n.translate('xpack.inventory.datastreamsBreadcrumbTitle', {
              defaultMessage: 'Data streams',
            })}
            path="/data_stream"
          >
            <Outlet />
          </InventoryRouterBreadcrumb>
        ),
        children: {
          '/data_stream': {
            element: <DatasetInventoryView />,
          },
          '/data_stream/{id}': {
            params: t.type({
              path: t.type({
                id: t.string,
              }),
            }),
            element: (
              <DatasetDetailView>
                <Outlet />
              </DatasetDetailView>
            ),
            children: {
              '/data_stream/{id}/overview': {
                element: <DatasetOverview />,
              },
              '/data_stream/{id}/metrics': {
                element: <DatasetMetricsView />,
              },
              '/data_stream/{id}/management': {
                element: <DatasetManagementView />,
              },
              '/data_stream/{id}/management/split': {
                element: <DatasetManagementSplitView />,
              },
              '/data_stream/{id}': {
                element: <RedirectTo path="/data_stream/{id}/overview" />,
              },
            },
          },
        },
      },
      '/{type}': {
        element: <Outlet />,
        params: t.type({
          path: t.type({ type: t.string }),
        }),
        children: {
          '/{type}/{id}': {
            params: t.type({
              path: t.type({ id: t.string }),
            }),
            element: <Outlet />,
            children: {
              '/{type}/{id}': {
                element: (
                  <RedirectTo path="/{type}/{id}/{tab}" params={{ path: { tab: 'overview' } }} />
                ),
              },
              '/{type}/{id}/{tab}': {
                element: <EntityDetailView />,
                params: t.type({
                  path: t.type({ tab: t.string }),
                }),
              },
            },
          },
        },
      },
      '/': {
        element: <RedirectTo path="/all" />,
      },
    },
  },
} satisfies RouteMap;

export type InventoryRoutes = typeof inventoryRoutes;

export const inventoryRouter = createRouter(inventoryRoutes);

export type InventoryRouter = typeof inventoryRouter;
