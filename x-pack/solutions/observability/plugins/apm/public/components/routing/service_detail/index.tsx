/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { Outlet } from '@kbn/typed-react-router-config';
import { z } from '@kbn/zod/v4';
import qs from 'query-string';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { dynamic } from '@kbn/shared-ux-utility';
import { toBooleanFromString } from '../../../../common/utils/to_boolean_from_string';
import { offsetSchema } from '../../../../common/comparison_rt';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { environmentSchema } from '../../../../common/environment_rt';
import {
  LatencyAggregationType,
  latencyAggregationTypeSchema,
} from '../../../../common/latency_aggregation_types';
import {
  DEFAULT_ANOMALY_THRESHOLD,
  anomalyThresholdSchema,
} from '../../../../common/anomaly_detection/anomaly_threshold';
import { ApmTimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import {
  ALERT_STATUS_ALL,
  AlertsOverview,
  AlertsSearchBarContextProvider,
  AlertsHeaderSearchBar,
} from '../../app/alerts_overview';
import { InfraTab } from '../../app/infra_overview/infra_tabs/use_tabs';
import { ApmServiceTemplate } from '../templates/apm_service_template';
import { ApmServiceWrapper } from './apm_service_wrapper';
import { RedirectToDefaultServiceRouteView } from './redirect_to_default_service_route_view';
import type { SearchBar } from '../../shared/search_bar/search_bar';
import { ServiceDependencies } from '../../app/service_dependencies';
import { ServiceDashboards } from '../../app/service_dashboards';
import { ErrorGroupDetails } from '../../app/error_group_details';
import { ServiceMapSearchBar } from '../../app/service_map/service_map_search_bar';
import { ServiceMapSearchProvider } from '../../app/service_map/service_map_search_context';

const ErrorGroupOverview = dynamic(() =>
  import('../../app/error_group_overview').then((mod) => ({ default: mod.ErrorGroupOverview }))
);
const InfraOverview = dynamic(() =>
  import('../../app/infra_overview').then((mod) => ({ default: mod.InfraOverview }))
);
const Metrics = dynamic(() =>
  import('../../app/metrics').then((mod) => ({ default: mod.Metrics }))
);
const MetricsDetails = dynamic(() =>
  import('../../app/metrics_details').then((mod) => ({ default: mod.MetricsDetails }))
);

const ServiceLogs = dynamic(() =>
  import('../../app/service_logs').then((mod) => ({ default: mod.ServiceLogs }))
);
const ServiceMapServiceDetail = dynamic(() =>
  import('../../app/service_map').then((mod) => ({ default: mod.ServiceMapServiceDetail }))
);
const ServiceOverview = dynamic(() =>
  import('../../app/service_overview').then((mod) => ({ default: mod.ServiceOverview }))
);
const TransactionDetails = dynamic(() =>
  import('../../app/transaction_details').then((mod) => ({ default: mod.TransactionDetails }))
);
const TransactionOverview = dynamic(() =>
  import('../../app/transaction_overview').then((mod) => ({ default: mod.TransactionOverview }))
);
const ProfilingOverview = dynamic(() =>
  import('../../app/profiling_overview').then((mod) => ({ default: mod.ProfilingOverview }))
);
const ProfilingHeaderSearchBar = dynamic(() =>
  import('../../app/profiling_overview').then((mod) => ({
    default: mod.ProfilingHeaderSearchBar,
  }))
);

function page({
  title,
  tab,
  element,
  searchBarOptions,
  customSearchBar,
  bottomHeaderContent,
  contentWrapper,
  contextWrapper: ContextWrapper,
}: {
  title: string;
  tab: React.ComponentProps<typeof ApmServiceTemplate>['selectedTab'];
  element: React.ReactElement<any, any>;
  searchBarOptions?: React.ComponentProps<typeof SearchBar>;
  customSearchBar?: React.ReactNode;
  bottomHeaderContent?: React.ComponentType;
  contentWrapper?: React.ComponentType<{ children: React.ReactNode }>;
  contextWrapper?: React.ComponentType<{ children: React.ReactNode }>;
}): {
  element: React.ReactElement<any, any>;
} {
  const template = (
    <ApmServiceTemplate
      title={title}
      selectedTab={tab}
      searchBarOptions={searchBarOptions}
      customSearchBar={customSearchBar}
      bottomHeaderContent={bottomHeaderContent}
      contentWrapper={contentWrapper}
    >
      {element}
    </ApmServiceTemplate>
  );
  return {
    element: ContextWrapper ? <ContextWrapper>{template}</ContextWrapper> : template,
  };
}

function RedirectNodesToMetrics() {
  const { query, path } = useApmParams('/services/{serviceName}/nodes');
  const search = qs.stringify(query);
  return <Redirect to={{ pathname: `/services/${path.serviceName}/metrics`, search }} />;
}

function RedirectNodeMetricsToMetricsDetails() {
  const { query, path } = useApmParams('/services/{serviceName}/nodes/{serviceNodeName}/metrics');
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
    params: z
      .object({
        path: z.object({
          serviceName: z.string(),
        }),
      })
      .merge(
        z.object({
          query: environmentSchema
            .merge(
              z.object({
                rangeFrom: z.string(),
                rangeTo: z.string(),
                kuery: z.string(),
                serviceGroup: z.string(),
                comparisonEnabled: toBooleanFromString,
              })
            )
            .merge(
              z.object({
                latencyAggregationType: latencyAggregationTypeSchema.optional(),
                anomalyThreshold: anomalyThresholdSchema.optional(),
                transactionType: z.string().optional(),
                refreshPaused: z.union([z.literal('true'), z.literal('false')]).optional(),
                refreshInterval: z.string().optional(),
              })
            )
            .merge(offsetSchema),
        })
      ),
    defaults: {
      query: {
        kuery: '',
        environment: ENVIRONMENT_ALL.value,
        serviceGroup: '',
        latencyAggregationType: LatencyAggregationType.avg,
        anomalyThreshold: DEFAULT_ANOMALY_THRESHOLD,
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
            showTimeComparison: true,
            showTransactionTypeSelector: true,
          },
        }),
        params: z.object({
          query: z
            .object({
              page: z.coerce.number().optional(),
              pageSize: z.coerce.number().optional(),
              sortField: z.string().optional(),
              sortDirection: z.union([z.literal('asc'), z.literal('desc')]).optional(),
            })
            .optional(),
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
        params: z.object({
          query: z
            .object({
              page: z.coerce.number().optional(),
              pageSize: z.coerce.number().optional(),
              sortField: z.string().optional(),
              sortDirection: z.union([z.literal('asc'), z.literal('desc')]).optional(),
            })
            .optional(),
        }),
        children: {
          '/services/{serviceName}/transactions/view': {
            element: <TransactionDetails />,
            params: z.object({
              query: z
                .object({
                  comparisonEnabled: toBooleanFromString,
                  showCriticalPath: toBooleanFromString,
                })
                .merge(z.object({ transactionName: z.string().optional() }))
                .merge(
                  z.object({
                    traceId: z.string().optional(),
                    transactionId: z.string().optional(),
                    flyoutDetailTab: z.string().optional(),
                    sampleRangeTo: z.coerce.number().optional(),
                    sampleRangeFrom: z.coerce.number().optional(),
                    page: z.coerce.number().optional(),
                    pageSize: z.coerce.number().optional(),
                    sortField: z.string().optional(),
                    sortDirection: z.union([z.literal('asc'), z.literal('desc')]).optional(),
                  })
                )
                .merge(offsetSchema),
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
        params: z.object({
          query: z
            .object({
              page: z.coerce.number().optional(),
              pageSize: z.coerce.number().optional(),
              sortField: z.string().optional(),
              sortDirection: z.union([z.literal('asc'), z.literal('desc')]).optional(),
            })
            .optional(),
        }),
        children: {
          '/services/{serviceName}/errors/{groupId}': {
            element: <ErrorGroupDetails />,
            params: z.object({
              path: z.object({
                groupId: z.string(),
              }),
              query: z.object({ errorId: z.string().optional() }),
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
            params: z.object({
              path: z.object({
                id: z.string(),
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
            params: z.object({
              path: z.object({
                serviceNodeName: z.string(),
              }),
            }),
          },
          '/services/{serviceName}/nodes': {
            element: <RedirectNodesToMetrics />,
            params: z.object({
              query: z
                .object({
                  sortDirection: z.union([z.literal('asc'), z.literal('desc')]).optional(),
                  sortField: z.string().optional(),
                  pageSize: z.coerce.number().optional(),
                  page: z.coerce.number().optional(),
                })
                .optional(),
            }),
          },
        },
      },
      '/services/{serviceName}/service-map': page({
        tab: 'service-map',
        title: i18n.translate('xpack.apm.views.serviceMap.title', {
          defaultMessage: 'Service map',
        }),
        element: <ServiceMapServiceDetail />,
        customSearchBar: <ServiceMapSearchBar />,
        contextWrapper: ServiceMapSearchProvider,
        searchBarOptions: {
          showTimeComparison: true,
          showFilterBar: true,
        },
      }),
      '/services/{serviceName}/logs': page({
        tab: 'logs',
        title: i18n.translate('xpack.apm.views.logs.title', {
          defaultMessage: 'Logs',
        }),
        element: <ServiceLogs />,
        searchBarOptions: {
          showQueryInput: true,
          searchBarPlaceholder: i18n.translate('xpack.apm.views.logs.searchBarPlaceholder', {
            defaultMessage: 'Search for log entries',
          }),
        },
      }),
      '/services/{serviceName}/infrastructure': {
        ...page({
          tab: 'infrastructure',
          title: i18n.translate('xpack.apm.views.infra.title', {
            defaultMessage: 'Infrastructure',
          }),
          element: <InfraOverview />,
        }),
        params: z.object({
          query: z
            .object({
              detailTab: z
                .union([
                  z.literal(InfraTab.containers),
                  z.literal(InfraTab.pods),
                  z.literal(InfraTab.hosts),
                ])
                .optional(),
            })
            .optional(),
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
            showUnifiedSearchBar: false,
          },
          bottomHeaderContent: AlertsHeaderSearchBar,
          contentWrapper: AlertsSearchBarContextProvider,
        }),
        params: z.object({
          query: z
            .object({
              alertStatus: z
                .union([
                  z.literal(ALERT_STATUS_ACTIVE),
                  z.literal(ALERT_STATUS_RECOVERED),
                  z.literal(ALERT_STATUS_ALL),
                ])
                .optional(),
            })
            .optional(),
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
          bottomHeaderContent: ProfilingHeaderSearchBar,
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
        params: z.object({
          query: z.object({ dashboardId: z.string().optional() }).optional(),
        }),
      },
      '/services/{serviceName}/': {
        element: <RedirectToDefaultServiceRouteView />,
      },
    },
  },
};
