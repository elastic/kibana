/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { toNumberRt } from '@kbn/io-ts-utils';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { TopNFunctionSortField, topNFunctionSortFieldRt } from '../../common/functions';
import { StackTracesDisplayOption, TopNType } from '../../common/stack_traces';
import { FlameGraphComparisonMode } from '../../common/flamegraph';
import { FlameGraphsView } from '../components/flame_graphs_view';
import { FunctionsView } from '../components/functions_view';
import { RedirectTo } from '../components/redirect_to';
import { RouteBreadcrumb } from '../components/route_breadcrumb';
import { StackTracesView } from '../components/stack_traces_view';

const routes = {
  '/': {
    element: (
      <RouteBreadcrumb
        title={i18n.translate('xpack.profiling.breadcrumb.profiling', {
          defaultMessage: 'Universal Profiling',
        })}
        href="/"
      >
        <Outlet />
      </RouteBreadcrumb>
    ),
    children: {
      '/': {
        children: {
          '/stacktraces/{topNType}': {
            element: <StackTracesView />,
            params: t.type({
              path: t.type({
                topNType: t.union([
                  t.literal(TopNType.Containers),
                  t.literal(TopNType.Deployments),
                  t.literal(TopNType.Hosts),
                  t.literal(TopNType.Threads),
                  t.literal(TopNType.Traces),
                ]),
              }),
              query: t.type({
                displayAs: t.union([
                  t.literal(StackTracesDisplayOption.StackTraces),
                  t.literal(StackTracesDisplayOption.Percentage),
                ]),
                limit: toNumberRt,
              }),
            }),
            defaults: {
              query: {
                displayAs: StackTracesDisplayOption.StackTraces,
                limit: '10',
              },
            },
          },
          '/stacktraces': {
            element: <RedirectTo pathname="/stacktraces/threads" />,
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
                params: t.type({
                  query: t.type({
                    comparisonRangeFrom: t.string,
                    comparisonRangeTo: t.string,
                    comparisonKuery: t.string,
                    comparisonMode: t.union([
                      t.literal(FlameGraphComparisonMode.Absolute),
                      t.literal(FlameGraphComparisonMode.Relative),
                    ]),
                  }),
                }),
                defaults: {
                  query: {
                    comparisonMode: FlameGraphComparisonMode.Absolute,
                  },
                },
              },
            },
          },
          '/functions': {
            element: (
              <RouteBreadcrumb
                title={i18n.translate('xpack.profiling.breadcrumb.functions', {
                  defaultMessage: 'Functions',
                })}
                href="/functions/topn"
              >
                <FunctionsView>
                  <Outlet />
                </FunctionsView>
              </RouteBreadcrumb>
            ),
            params: t.type({
              query: t.type({
                sortField: topNFunctionSortFieldRt,
                sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
              }),
            }),
            defaults: {
              query: {
                sortField: TopNFunctionSortField.Rank,
                sortDirection: 'asc',
              },
            },
            children: {
              '/functions/topn': {
                element: (
                  <RouteBreadcrumb
                    title={i18n.translate('xpack.profiling.breadcrumb.topnFunctions', {
                      defaultMessage: 'Top N',
                    })}
                    href="/functions/topn"
                  >
                    <Outlet />
                  </RouteBreadcrumb>
                ),
              },
              '/functions/differential': {
                element: (
                  <RouteBreadcrumb
                    title={i18n.translate('xpack.profiling.breadcrumb.differentialFunctions', {
                      defaultMessage: 'Differential Top N',
                    })}
                    href="/functions/differential"
                  >
                    <Outlet />
                  </RouteBreadcrumb>
                ),
                params: t.type({
                  query: t.type({
                    comparisonRangeFrom: t.string,
                    comparisonRangeTo: t.string,
                    comparisonKuery: t.string,
                  }),
                }),
              },
            },
          },
          '/': {
            element: <RedirectTo pathname="/stacktraces/threads" />,
          },
        },
        element: <Outlet />,
        params: t.type({
          query: t.type({
            rangeFrom: t.string,
            rangeTo: t.string,
            kuery: t.string,
          }),
        }),
        defaults: {
          query: {
            kuery: '',
          },
        },
      },
    },
  },
};

export const profilingRouter = createRouter(routes);
export type ProfilingRoutes = typeof routes;
export type ProfilingRouter = typeof profilingRouter;
