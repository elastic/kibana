/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import {
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
} from '@kbn/rule-data-utils';
import { Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import qs from 'query-string';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { offsetRt } from '../../../../common/comparison_rt';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { environmentRt } from '../../../../common/environment_rt';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { ApmTimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { AlertsOverview, ALERT_STATUS_ALL } from '../../app/alerts_overview';
import { ErrorGroupDetails } from '../../app/error_group_details';
import { ErrorGroupOverview } from '../../app/error_group_overview';
import { InfraOverview } from '../../app/infra_overview';
import { InfraTab } from '../../app/infra_overview/infra_tabs/use_tabs';
import { Metrics } from '../../app/metrics';
import { MetricsDetails } from '../../app/metrics_details';
import { ServiceDependencies } from '../../app/service_dependencies';
import { ServiceLogs } from '../../app/service_logs';
import { ServiceMapServiceDetail } from '../../app/service_map';
import { ServiceOverview } from '../../app/service_overview';
import { TransactionDetails } from '../../app/transaction_details';
import { TransactionOverview } from '../../app/transaction_overview';
import { ApmServiceTemplate } from '../templates/apm_service_template';
import { ApmServiceWrapper } from './apm_service_wrapper';
import { RedirectToDefaultServiceRouteView } from './redirect_to_default_service_route_view';
import { ProfilingOverview } from '../../app/profiling_overview';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { ServiceDashboards } from '../../app/service_dashboards';

function page({
  title,
  tab,
  element,
  searchBarOptions,
}: {
  title: string;
  tab: React.ComponentProps<typeof ApmServiceTemplate>['selectedTab'];
  element: React.ReactElement<any, any>;
  searchBarOptions?: React.ComponentProps<typeof SearchBar>;
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

function RedirectNodesToMetrics() {
  const { query, path } = useApmParams('/services/{serviceName}/nodes');
  const search = qs.stringify(query);
  return (
    <Redirect
      to={{ pathname: `/services/${path.serviceName}/metrics`, search }}
    />
  );
}

function RedirectNodeMetricsToMetricsDetails() {
  const { query, path } = useApmParams(
    '/services/{serviceName}/nodes/{serviceNodeName}/metrics'
  );
  const search = qs.stringify(query);
  return (
    <Redirect
      to={{
        pathname: `/services/${path.serviceName}/metrics/${path.serviceNodeName}`,
        search,
      }}
    />
  );
}

export const serviceDetailRoute = {
  '/services/{serviceName}': {
    element: (
      <ApmTimeRangeMetadataContextProvider>
        <ApmServiceWrapper />
      </ApmTimeRangeMetadataContextProvider>
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
                  showCriticalPath: toBooleanRt,
                }),
                t.partial({
                  traceId: t.string,
                  transactionId: t.string,
                  flyoutDetailTab: t.string,
                }),
                offsetRt,
              ]),
            }),
            defaults: {
              query: {
                showCriticalPath: '',
              },
            },
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
              query: t.partial({ errorId: t.string }),
            }),
          },
          '/services/{serviceName}/errors': {
            element: <ErrorGroupOverview />,
          },
        },
      },
      '/services/{serviceName}/metrics': {
        ...page({
          tab: 'metrics',
          title: i18n.translate('xpack.apm.views.metrics.title', {
            defaultMessage: 'Metrics',
          }),
          element: <Outlet />,
        }),
        children: {
          '/services/{serviceName}/metrics': {
            element: <Metrics />,
          },
          '/services/{serviceName}/metrics/{id}': {
            element: <MetricsDetails />,
            params: t.type({
              path: t.type({
                id: t.string,
              }),
            }),
          },
        },
      },
      // Deprecated: redirect it to metrics
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
            element: <RedirectNodeMetricsToMetricsDetails />,
            params: t.type({
              path: t.type({
                serviceNodeName: t.string,
              }),
            }),
          },
          '/services/{serviceName}/nodes': {
            element: <RedirectNodesToMetrics />,
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
          showUnifiedSearchBar: false,
        },
      }),
      '/services/{serviceName}/infrastructure': {
        ...page({
          tab: 'infrastructure',
          title: i18n.translate('xpack.apm.views.infra.title', {
            defaultMessage: 'Infrastructure',
          }),
          element: <InfraOverview />,
          searchBarOptions: {
            showUnifiedSearchBar: false,
          },
        }),
        params: t.partial({
          query: t.partial({
            detailTab: t.union([
              t.literal(InfraTab.containers),
              t.literal(InfraTab.pods),
              t.literal(InfraTab.hosts),
            ]),
          }),
        }),
      },
      '/services/{serviceName}/alerts': {
        ...page({
          tab: 'alerts',
          title: i18n.translate('xpack.apm.views.alerts.title', {
            defaultMessage: 'Alerts',
          }),
          element: <AlertsOverview />,
          searchBarOptions: {
            hidden: true,
          },
        }),
        params: t.partial({
          query: t.partial({
            alertStatus: t.union([
              t.literal(ALERT_STATUS_ACTIVE),
              t.literal(ALERT_STATUS_RECOVERED),
              t.literal(ALERT_STATUS_ALL),
            ]),
          }),
        }),
      },
      '/services/{serviceName}/profiling': {
        ...page({
          tab: 'profiling',
          title: i18n.translate('xpack.apm.views.profiling.title', {
            defaultMessage: 'Universal Profiling',
          }),
          element: <ProfilingOverview />,
          searchBarOptions: {
            hidden: true,
          },
        }),
      },
      '/services/{serviceName}/dashboards': {
        ...page({
          tab: 'dashboards',
          title: i18n.translate('xpack.apm.views.dashboard.title', {
            defaultMessage: 'Dashboards',
          }),
          element: <ServiceDashboards />,
        }),
        params: t.partial({
          query: t.partial({
            dashboardId: t.string,
          }),
        }),
      },
      '/services/{serviceName}/': {
        element: <RedirectToDefaultServiceRouteView />,
      },
    },
  },
};
