/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Outlet } from '@kbn/typed-react-router-config';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { environmentRt } from '../../../../common/environment_rt';
import { ServiceOverview } from '../../app/service_overview';
import { ApmServiceTemplate } from '../templates/apm_service_template';
import { RedirectToDefaultServiceRouteView } from './redirect_to_default_service_route_view';
import { TransactionOverview } from '../../app/transaction_overview';
import { ApmServiceWrapper } from './apm_service_wrapper';
import { ErrorGroupOverview } from '../../app/error_group_overview';
import { ErrorGroupDetails } from '../../app/error_group_details';
import { ServiceMetrics } from '../../app/service_metrics';
import { ServiceNodeOverview } from '../../app/service_node_overview';
import { ServiceNodeMetrics } from '../../app/service_node_metrics';
import { ServiceMapServiceDetail } from '../../app/service_map';
import { TransactionDetails } from '../../app/transaction_details';
import { ServiceProfiling } from '../../app/service_profiling';
import { ServiceDependencies } from '../../app/service_dependencies';
import { ServiceLogs } from '../../app/service_logs';

function page<TPath extends string>({
  path,
  title,
  tab,
  element,
  searchBarOptions,
}: {
  path: TPath;
  title: string;
  tab: React.ComponentProps<typeof ApmServiceTemplate>['selectedTab'];
  element: React.ReactElement<any, any>;
  searchBarOptions?: {
    showTransactionTypeSelector?: boolean;
    showTimeComparison?: boolean;
    hidden?: boolean;
  };
}): {
  element: React.ReactElement<any, any>;
  path: TPath;
} {
  return {
    path,
    element: (
      <ApmServiceTemplate
        title={title}
        selectedTab={tab}
        searchBarOptions={searchBarOptions}
      >
        {element}
      </ApmServiceTemplate>
    ),
  } as any;
}

export const serviceDetail = {
  path: '/services/:serviceName',
  element: <ApmServiceWrapper />,
  params: t.intersection([
    t.type({
      path: t.type({
        serviceName: t.string,
      }),
    }),
    t.type({
      query: t.intersection([
        environmentRt,
        t.type({
          rangeFrom: t.string,
          rangeTo: t.string,
          kuery: t.string,
        }),
        t.partial({
          comparisonEnabled: t.string,
          comparisonType: t.string,
          latencyAggregationType: t.string,
          transactionType: t.string,
        }),
      ]),
    }),
  ]),
  defaults: {
    query: {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      kuery: '',
      environment: ENVIRONMENT_ALL.value,
    },
  },
  children: [
    page({
      path: '/overview',
      element: <ServiceOverview />,
      tab: 'overview',
      title: i18n.translate('xpack.apm.views.overview.title', {
        defaultMessage: 'Overview',
      }),
      searchBarOptions: {
        showTransactionTypeSelector: true,
        showTimeComparison: true,
      },
    }),
    {
      ...page({
        path: '/transactions',
        tab: 'transactions',
        title: i18n.translate('xpack.apm.views.transactions.title', {
          defaultMessage: 'Transactions',
        }),
        element: <Outlet />,
        searchBarOptions: {
          showTransactionTypeSelector: true,
          showTimeComparison: true,
        },
      }),
      children: [
        {
          path: '/view',
          element: <TransactionDetails />,
          params: t.type({
            query: t.intersection([
              t.type({
                transactionName: t.string,
              }),
              t.partial({
                traceId: t.string,
                transactionId: t.string,
              }),
            ]),
          }),
        },
        {
          path: '/',
          element: <TransactionOverview />,
        },
      ],
    },
    page({
      path: '/dependencies',
      element: <ServiceDependencies />,
      tab: 'dependencies',
      title: i18n.translate('xpack.apm.views.dependencies.title', {
        defaultMessage: 'Dependencies',
      }),
      searchBarOptions: {
        showTimeComparison: true,
      },
    }),
    {
      ...page({
        path: '/errors',
        tab: 'errors',
        title: i18n.translate('xpack.apm.views.errors.title', {
          defaultMessage: 'Errors',
        }),
        element: <Outlet />,
      }),
      params: t.partial({
        query: t.partial({
          sortDirection: t.string,
          sortField: t.string,
          pageSize: t.string,
          page: t.string,
        }),
      }),
      children: [
        {
          path: '/:groupId',
          element: <ErrorGroupDetails />,
          params: t.type({
            path: t.type({
              groupId: t.string,
            }),
          }),
        },
        {
          path: '/',
          element: <ErrorGroupOverview />,
        },
      ],
    },
    page({
      path: '/metrics',
      tab: 'metrics',
      title: i18n.translate('xpack.apm.views.metrics.title', {
        defaultMessage: 'Metrics',
      }),
      element: <ServiceMetrics />,
    }),
    {
      ...page({
        path: '/nodes',
        tab: 'nodes',
        title: i18n.translate('xpack.apm.views.nodes.title', {
          defaultMessage: 'JVMs',
        }),
        element: <Outlet />,
      }),
      children: [
        {
          path: '/:serviceNodeName/metrics',
          element: <ServiceNodeMetrics />,
          params: t.type({
            path: t.type({
              serviceNodeName: t.string,
            }),
          }),
        },
        {
          path: '/',
          element: <ServiceNodeOverview />,
          params: t.partial({
            query: t.partial({
              sortDirection: t.string,
              sortField: t.string,
              pageSize: t.string,
              page: t.string,
            }),
          }),
        },
      ],
    },
    page({
      path: '/service-map',
      tab: 'service-map',
      title: i18n.translate('xpack.apm.views.serviceMap.title', {
        defaultMessage: 'Service Map',
      }),
      element: <ServiceMapServiceDetail />,
      searchBarOptions: {
        hidden: true,
      },
    }),
    page({
      path: '/logs',
      tab: 'logs',
      title: i18n.translate('xpack.apm.views.logs.title', {
        defaultMessage: 'Logs',
      }),
      element: <ServiceLogs />,
    }),
    page({
      path: '/profiling',
      tab: 'profiling',
      title: i18n.translate('xpack.apm.views.serviceProfiling.title', {
        defaultMessage: 'Profiling',
      }),
      element: <ServiceProfiling />,
    }),
    {
      path: '/',
      element: <RedirectToDefaultServiceRouteView />,
    },
  ],
} as const;
