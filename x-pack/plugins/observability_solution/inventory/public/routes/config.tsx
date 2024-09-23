/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { createRouter, Outlet, RouteMap } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { AllInventoryView } from '../components/all_inventory_view';
import { DefinitionsView } from '../components/definitions_view';
import { EntityDetailView } from '../components/entity_detail_view';
import { InventoryPageTemplate } from '../components/inventory_page_template';
import { InventoryRouterBreadcrumb } from '../components/inventory_router_breadcrumb';
import { RedirectTo } from '../components/redirect_to';
import { TypeInventoryView } from '../components/type_inventory_view';
import { DataStreamDetailView } from '../components/data_stream_detail_view';

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
      '/data_stream/{displayName}': {
        element: <Outlet />,
        params: t.type({
          path: t.type({
            displayName: t.string,
          }),
        }),
        children: {
          '/data_stream/{displayName}': {
            element: (
              <RedirectTo
                path="/data_stream/{displayName}/{tab}"
                params={{ path: { tab: 'overview' } }}
              />
            ),
          },
          '/data_stream/{displayName}/{tab}': {
            element: <DataStreamDetailView />,
            params: t.type({
              path: t.type({
                tab: t.string,
              }),
            }),
          },
        },
      },
      '/{type}': {
        element: <Outlet />,
        params: t.type({
          path: t.type({ type: t.string }),
        }),
        children: {
          '/{type}': {
            element: <TypeInventoryView />,
          },
          '/{type}/{displayName}': {
            params: t.type({
              path: t.type({ displayName: t.string }),
            }),
            element: <Outlet />,
            children: {
              '/{type}/{displayName}': {
                element: (
                  <RedirectTo
                    path="/{type}/{displayName}/{tab}"
                    params={{ path: { tab: 'overview' } }}
                  />
                ),
              },
              '/{type}/{displayName}/{tab}': {
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
