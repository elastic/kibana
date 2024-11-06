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
import { AllEntitiesView } from '../components/all_entities_view';
import { EntityDetailView } from '../components/entity_detail_view';
import { StreamsAppPageTemplate } from '../components/streams_app_page_template';
import { StreamsAppRouterBreadcrumb } from '../components/streams_app_router_breadcrumb';
import { RedirectTo } from '../components/redirect_to';
import { DataStreamDetailView } from '../components/data_stream_detail_view';
import { EntityPivotTypeView } from '../components/entity_pivot_type_view';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const streamsAppRoutes = {
  '/': {
    element: (
      <StreamsAppRouterBreadcrumb
        title={i18n.translate('xpack.entities.appBreadcrumbTitle', {
          defaultMessage: 'Entities',
        })}
        path="/"
      >
        <StreamsAppPageTemplate>
          <Outlet />
        </StreamsAppPageTemplate>
      </StreamsAppRouterBreadcrumb>
    ),
    children: {
      '/all': {
        element: (
          <StreamsAppRouterBreadcrumb
            title={i18n.translate('xpack.entities.allEntitiesView.breadcrumbTitle', {
              defaultMessage: 'All',
            })}
            path="/all"
          >
            <AllEntitiesView />
          </StreamsAppRouterBreadcrumb>
        ),
      },
      '/data_stream/{key}': {
        element: <Outlet />,
        params: t.type({
          path: t.type({
            key: t.string,
          }),
        }),
        children: {
          '/data_stream/{key}': {
            element: (
              <RedirectTo path="/data_stream/{key}/{tab}" params={{ path: { tab: 'overview' } }} />
            ),
          },
          '/data_stream/{key}/{tab}': {
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
            element: <EntityPivotTypeView />,
          },
          '/{type}/{key}': {
            params: t.type({
              path: t.type({ key: t.string }),
            }),
            element: <Outlet />,
            children: {
              '/{type}/{key}': {
                element: (
                  <RedirectTo path="/{type}/{key}/{tab}" params={{ path: { tab: 'overview' } }} />
                ),
              },
              '/{type}/{key}/{tab}': {
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
        element: <RedirectTo path="/{type}" params={{ path: { type: 'data_stream' } }} />,
      },
    },
  },
} satisfies RouteMap;

export type StreamsAppRoutes = typeof streamsAppRoutes;

export const streamsAppRouter = createRouter(streamsAppRoutes);

export type StreamsAppRouter = typeof streamsAppRouter;
