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
import { i18n } from '@kbn/i18n';
import { StackTracesView } from '../components/stack_traces_view';
import { FlameGraphsView } from '../components/flame_graphs_view';
import { RouteBreadcrumb } from '../components/route_breadcrumb';

const routes = {
  '/': {
    element: (
      <RouteBreadcrumb
        title={i18n.translate('xpack.profiling.breadcrumb.profiling', {
          defaultMessage: 'Profiling',
        })}
        href="/"
      >
        <Outlet />
      </RouteBreadcrumb>
    ),
    children: {
      '/': {
        children: {
          '/stacktraces': {
            element: (
              <RouteBreadcrumb
                title={i18n.translate('xpack.profiling.breadcrumb.stackTraces', {
                  defaultMessage: 'Stacktraces',
                })}
                href="/stacktraces"
              >
                <StackTracesView>
                  <Outlet />
                </StackTracesView>
              </RouteBreadcrumb>
            ),
            children: {
              '/stacktraces/containers': {
                element: (
                  <RouteBreadcrumb
                    title={i18n.translate('xpack.profiling.breadcrumb.containers', {
                      defaultMessage: 'Containers',
                    })}
                    href="/stacktraces/containers"
                  >
                    <Outlet />
                  </RouteBreadcrumb>
                ),
              },
              '/stacktraces/deployments': {
                element: (
                  <RouteBreadcrumb
                    title={i18n.translate('xpack.profiling.breadcrumb.deployments', {
                      defaultMessage: 'Deployments',
                    })}
                    href="/stacktraces/deployments"
                  >
                    <Outlet />
                  </RouteBreadcrumb>
                ),
              },
              '/stacktraces/threads': {
                element: (
                  <RouteBreadcrumb
                    title={i18n.translate('xpack.profiling.breadcrumb.threads', {
                      defaultMessage: 'Threads',
                    })}
                    href="/stacktraces/threads"
                  >
                    <Outlet />
                  </RouteBreadcrumb>
                ),
              },
              '/stacktraces/hosts': {
                element: (
                  <RouteBreadcrumb
                    title={i18n.translate('xpack.profiling.breadcrumb.hosts', {
                      defaultMessage: 'Hosts',
                    })}
                    href="/stacktraces/hosts"
                  >
                    <Outlet />
                  </RouteBreadcrumb>
                ),
              },
              '/stacktraces/traces': {
                element: (
                  <RouteBreadcrumb
                    title={i18n.translate('xpack.profiling.breadcrumb.traces', {
                      defaultMessage: 'Traces',
                    })}
                    href="/stacktraces/traces"
                  >
                    <Outlet />
                  </RouteBreadcrumb>
                ),
              },
              '/stacktraces': {
                element: <Redirect to="/stacktraces/containers" />,
              },
            },
          },
          '/flamegraphs': {
            element: (
              <RouteBreadcrumb
                title={i18n.translate('xpack.profiling.breadcrumb.flamegraphs', {
                  defaultMessage: 'Flamegraphs',
                })}
                href="/flamegraphs/flamegraph"
              >
                <FlameGraphsView>
                  <Outlet />
                </FlameGraphsView>
              </RouteBreadcrumb>
            ),
            children: {
              '/flamegraphs/flamegraph': {
                element: (
                  <RouteBreadcrumb
                    title={i18n.translate('xpack.profiling.breadcrumb.flamegraph', {
                      defaultMessage: 'Flamegraph',
                    })}
                    href="/flamegraphs/flamegraph"
                  >
                    <Outlet />
                  </RouteBreadcrumb>
                ),
              },
              '/flamegraphs/differential': {
                element: (
                  <RouteBreadcrumb
                    title={i18n.translate('xpack.profiling.breadcrumb.differentialFlamegraph', {
                      defaultMessage: 'Differential flamegraph',
                    })}
                    href="/flamegraphs/differential"
                  >
                    <Outlet />
                  </RouteBreadcrumb>
                ),
              },
              '/flamegraphs': {
                element: <Redirect to="/flamegraphs/flamegraph" />,
              },
            },
          },
          '/': {
            element: <Redirect to="/stacktraces/containers" />,
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
