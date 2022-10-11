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
import { toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
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
import { ServiceDependencies } from '../../app/service_dependencies';
import { ServiceLogs } from '../../app/service_logs';
import { InfraOverview } from '../../app/infra_overview';
import { AlertsOverview } from '../../app/alerts_overview';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { offsetRt } from '../../../../common/comparison_rt';
import { TimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';

function page({
  title,
  tab,
  element,
  searchBarOptions,
}: {
  title: string;
  tab: React.ComponentProps<typeof ApmServiceTemplate>['selectedTab'];
  element: React.ReactElement<any, any>;
  searchBarOptions?: {
    showKueryBar?: boolean;
    showTransactionTypeSelector?: boolean;
    showTimeComparison?: boolean;
    hidden?: boolean;
  };
}): {
  element: React.ReactElement<any, any>;
} {
  return {
    element: (
      <ApmServiceTemplate
        title={title}
        selectedTab={tab}
        searchBarOptions={searchBarOptions}
      >
        {element}
      </ApmServiceTemplate>
    ),
  };
}

export const serviceDetail = {
  '/services/{serviceName}': {
    element: (
      <TimeRangeMetadataContextProvider>
        <ApmServiceWrapper />
      </TimeRangeMetadataContextProvider>
    ),
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
            serviceGroup: t.string,
            comparisonEnabled: toBooleanRt,
          }),
          t.partial({
            latencyAggregationType: t.string,
            transactionType: t.string,
            refreshPaused: t.union([t.literal('true'), t.literal('false')]),
            refreshInterval: t.string,
          }),
          offsetRt,
        ]),
      }),
    ]),
    defaults: {
      query: {
        kuery: '',
        environment: ENVIRONMENT_ALL.value,
        serviceGroup: '',
        latencyAggregationType: LatencyAggregationType.avg,
      },
    },
    children: {
      '/services/{serviceName}/overview': {
        ...page({
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
        params: t.partial({
          query: t.partial({
            page: toNumberRt,
            pageSize: toNumberRt,
            sortField: t.string,
            sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
          }),
        }),
      },
      '/services/{serviceName}/transactions': {
        ...page({
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
        params: t.partial({
          query: t.partial({
            page: toNumberRt,
            pageSize: toNumberRt,
            sortField: t.string,
            sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
          }),
        }),
        children: {
          '/services/{serviceName}/transactions/view': {
            element: <TransactionDetails />,
            params: t.type({
              query: t.intersection([
                t.type({
                  transactionName: t.string,
                  comparisonEnabled: toBooleanRt,
                }),
                t.partial({
                  traceId: t.string,
                  transactionId: t.string,
                }),
                offsetRt,
              ]),
            }),
          },
          '/services/{serviceName}/transactions': {
            element: <TransactionOverview />,
          },
        },
      },
      '/services/{serviceName}/dependencies': page({
        element: <ServiceDependencies />,
        tab: 'dependencies',
        title: i18n.translate('xpack.apm.views.dependencies.title', {
          defaultMessage: 'Dependencies',
        }),
        searchBarOptions: {
          showTimeComparison: true,
        },
      }),
      '/services/{serviceName}/errors': {
        ...page({
          tab: 'errors',
          title: i18n.translate('xpack.apm.views.errors.title', {
            defaultMessage: 'Errors',
          }),
          element: <Outlet />,
          searchBarOptions: {
            showTimeComparison: true,
          },
        }),
        params: t.partial({
          query: t.partial({
            page: toNumberRt,
            pageSize: toNumberRt,
            sortField: t.string,
            sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
          }),
        }),
        children: {
          '/services/{serviceName}/errors/{groupId}': {
            element: <ErrorGroupDetails />,
            params: t.type({
              path: t.type({
                groupId: t.string,
              }),
            }),
          },
          '/services/{serviceName}/errors': {
            element: <ErrorGroupOverview />,
          },
        },
      },
      '/services/{serviceName}/metrics': page({
        tab: 'metrics',
        title: i18n.translate('xpack.apm.views.metrics.title', {
          defaultMessage: 'Metrics',
        }),
        element: <ServiceMetrics />,
      }),
      '/services/{serviceName}/nodes': {
        ...page({
          tab: 'nodes',
          title: i18n.translate('xpack.apm.views.nodes.title', {
            defaultMessage: 'Metrics',
          }),
          element: <Outlet />,
        }),
        children: {
          '/services/{serviceName}/nodes/{serviceNodeName}/metrics': {
            element: <ServiceNodeMetrics />,
            params: t.type({
              path: t.type({
                serviceNodeName: t.string,
              }),
            }),
          },
          '/services/{serviceName}/nodes': {
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
        },
      },
      '/services/{serviceName}/service-map': page({
        tab: 'service-map',
        title: i18n.translate('xpack.apm.views.serviceMap.title', {
          defaultMessage: 'Service Map',
        }),
        element: <ServiceMapServiceDetail />,
        searchBarOptions: {
          hidden: true,
        },
      }),
      '/services/{serviceName}/logs': page({
        tab: 'logs',
        title: i18n.translate('xpack.apm.views.logs.title', {
          defaultMessage: 'Logs',
        }),
        element: <ServiceLogs />,
        searchBarOptions: {
          showKueryBar: false,
        },
      }),
      '/services/{serviceName}/infrastructure': page({
        tab: 'infrastructure',
        title: i18n.translate('xpack.apm.views.infra.title', {
          defaultMessage: 'Infrastructure',
        }),
        element: <InfraOverview />,
        searchBarOptions: {
          showKueryBar: false,
          showTimeComparison: false,
          showTransactionTypeSelector: false,
        },
      }),
      '/services/{serviceName}/alerts': page({
        tab: 'alerts',
        title: i18n.translate('xpack.apm.views.alerts.title', {
          defaultMessage: 'Alerts',
        }),
        element: <AlertsOverview />,
        searchBarOptions: {
          hidden: true,
        },
      }),
      '/services/{serviceName}/': {
        element: <RedirectToDefaultServiceRouteView />,
      },
    },
  },
};
