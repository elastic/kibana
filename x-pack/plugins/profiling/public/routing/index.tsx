/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import * as t from 'io-ts';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import { toNumberRt } from '@kbn/io-ts-utils';
import { Redirect } from 'react-router-dom';
import { StackTracesView } from '../components/stack_traces_view';
import { FlameGraphsView } from '../components/flame_graphs_view';

const routes = {
  '/': {
    element: <Outlet />,
    children: {
      '/': {
        children: {
          '/stacktraces': {
            element: (
              <StackTracesView>
                <Outlet />
              </StackTracesView>
            ),
            children: {
              '/stacktraces/containers': {
                element: <></>,
              },
              '/stacktraces/deployments': {
                element: <></>,
              },
              '/stacktraces/threads': {
                element: <></>,
              },
              '/stacktraces/hosts': {
                element: <></>,
              },
              '/stacktraces/traces': {
                element: <></>,
              },
              '/stacktraces': {
                element: <Redirect to="/stacktraces/containers" />,
              },
            },
          },
          '/flamegraphs': {
            element: (
              <FlameGraphsView>
                <Outlet />
              </FlameGraphsView>
            ),
            children: {
              '/flamegraphs/flamegraph': {
                element: <></>,
              },
              '/flamegraphs/differential': {
                element: <></>,
              },
              '/': {
                element: <Redirect to="/flamegraphs/flamegraph" />,
              },
            },
          },
          '/': {
            element: <Redirect to="/flamegraphs/flamegraph" />,
          },
        },
        element: <Outlet />,
        params: t.type({
          query: t.type({
            rangeFrom: t.string,
            rangeTo: t.string,
            index: t.string,
            n: toNumberRt,
            projectID: toNumberRt,
          }),
        }),
        defaults: {
          query: {
            index: 'profiling-events-all',
            n: '100',
            projectID: '5',
          },
        },
      },
    },
  },
};

export const profilingRouter = createRouter(routes);
export type ProfilingRoutes = typeof routes;
export type ProfilingRouter = typeof profilingRouter;
