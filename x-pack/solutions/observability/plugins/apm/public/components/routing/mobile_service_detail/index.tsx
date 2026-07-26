/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Outlet } from '@kbn/typed-react-router-config';
import { z } from '@kbn/zod/v4';
import React from 'react';
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
import {
  AlertsOverview,
  AlertsSearchBarContextProvider,
  AlertsHeaderSearchBar,
} from '../../app/alerts_overview';
import { ServiceMapServiceDetail } from '../../app/service_map';
import { MobileServiceTemplate } from '../templates/mobile_service_template';
import { MobileServiceOverview } from '../../app/mobile/service_overview';
import { MobileTransactionOverview } from '../../app/mobile/transaction_overview';
import { TransactionDetails } from '../../app/transaction_details';
import { RedirectToDefaultServiceRouteView } from '../service_detail/redirect_to_default_service_route_view';
import { ApmTimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { ErrorGroupDetails } from '../../app/mobile/errors_and_crashes_group_details/error_group_details';
import { CrashGroupDetails } from '../../app/mobile/errors_and_crashes_group_details/crash_group_details';
import { MobileErrorCrashesOverview } from '../../app/mobile/errors_and_crashes_overview';
import { ServiceDependencies } from '../../app/service_dependencies';
import { ServiceDashboards } from '../../app/service_dashboards';
import type { MobileSearchBar } from '../../app/mobile/search_bar';
import { ServiceMapSearchBar } from '../../app/service_map/service_map_search_bar';
import { ServiceMapSearchProvider } from '../../app/service_map/service_map_search_context';

const ServiceLogs = dynamic(() =>
  import('../../app/service_logs').then((mod) => ({ default: mod.ServiceLogs }))
);

export function page({
  title,
  tabKey,
  element,
  searchBarOptions,
  customSearchBar,
  bottomHeaderContent,
  contentWrapper,
  contextWrapper: ContextWrapper,
}: {
  title: string;
  tabKey: React.ComponentProps<typeof MobileServiceTemplate>['selectedTabKey'];
  element: React.ReactElement<any, any>;
  searchBarOptions?: React.ComponentProps<typeof MobileSearchBar>;
  customSearchBar?: React.ReactNode;
  bottomHeaderContent?: React.ComponentType;
  contentWrapper?: React.ComponentType<{ children: React.ReactNode }>;
  contextWrapper?: React.ComponentType<{ children: React.ReactNode }>;
}): {
  element: React.ReactElement<any, any>;
} {
  const template = (
    <MobileServiceTemplate
      title={title}
      selectedTabKey={tabKey}
      searchBarOptions={searchBarOptions}
      customSearchBar={customSearchBar}
      bottomHeaderContent={bottomHeaderContent}
      contentWrapper={contentWrapper}
    >
      {element}
    </MobileServiceTemplate>
  );
  return {
    element: ContextWrapper ? <ContextWrapper>{template}</ContextWrapper> : template,
  };
}

export const mobileServiceDetailRoute = {
  '/mobile-services/{serviceName}': {
    element: (
      <ApmTimeRangeMetadataContextProvider>
        <Outlet />
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
      '/mobile-services/{serviceName}/overview': {
        ...page({
          element: <MobileServiceOverview />,
          tabKey: 'overview',
          title: i18n.translate('xpack.apm.views.overview.title', {
            defaultMessage: 'Overview',
          }),
          searchBarOptions: {
            showTimeComparison: true,
            showMobileFilters: true,
          },
        }),
        params: z
          .object({
            query: z
              .object({
                page: z.coerce.number().optional(),
                pageSize: z.coerce.number().optional(),
                sortField: z.string().optional(),
                sortDirection: z.union([z.literal('asc'), z.literal('desc')]).optional(),
                device: z.string().optional(),
                osVersion: z.string().optional(),
                appVersion: z.string().optional(),
                netConnectionType: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
      },
      '/mobile-services/{serviceName}/transactions': {
        ...page({
          tabKey: 'transactions',
          title: i18n.translate('xpack.apm.views.transactions.title', {
            defaultMessage: 'Transactions',
          }),
          element: <Outlet />,
          searchBarOptions: {
            showTimeComparison: true,
            showMobileFilters: true,
          },
        }),
        params: z
          .object({
            query: z
              .object({
                page: z.coerce.number().optional(),
                pageSize: z.coerce.number().optional(),
                sortField: z.string().optional(),
                sortDirection: z.union([z.literal('asc'), z.literal('desc')]).optional(),
                device: z.string().optional(),
                osVersion: z.string().optional(),
                appVersion: z.string().optional(),
                netConnectionType: z.string().optional(),
                mobileSelectedTab: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
        children: {
          '/mobile-services/{serviceName}/transactions/view': {
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
          '/mobile-services/{serviceName}/transactions': {
            element: <MobileTransactionOverview />,
          },
        },
      },
      '/mobile-services/{serviceName}/errors-and-crashes': {
        ...page({
          tabKey: 'errors-and-crashes',
          title: i18n.translate('xpack.apm.views.errorsAndCrashes.title', {
            defaultMessage: 'Errors & Crashes',
          }),
          element: <Outlet />,
          searchBarOptions: {
            showTimeComparison: true,
            showMobileFilters: true,
          },
        }),
        params: z
          .object({
            query: z
              .object({
                page: z.coerce.number().optional(),
                pageSize: z.coerce.number().optional(),
                sortField: z.string().optional(),
                sortDirection: z.union([z.literal('asc'), z.literal('desc')]).optional(),
                mobileErrorTabId: z.string().optional(),
                device: z.string().optional(),
                osVersion: z.string().optional(),
                appVersion: z.string().optional(),
                netConnectionType: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
        children: {
          '/mobile-services/{serviceName}/errors-and-crashes/errors/{groupId}': {
            element: <ErrorGroupDetails />,
            params: z.object({
              path: z.object({
                groupId: z.string(),
              }),
              query: z.object({ errorId: z.string().optional() }),
            }),
          },
          '/mobile-services/{serviceName}/errors-and-crashes/': {
            element: <MobileErrorCrashesOverview />,
          },
          '/mobile-services/{serviceName}/errors-and-crashes/crashes/{groupId}': {
            element: <CrashGroupDetails />,
            params: z.object({
              path: z.object({
                groupId: z.string(),
              }),
              query: z.object({ errorId: z.string().optional() }),
            }),
          },
        },
      },
      '/mobile-services/{serviceName}/dependencies': page({
        element: <ServiceDependencies />,
        tabKey: 'dependencies',
        title: i18n.translate('xpack.apm.views.dependencies.title', {
          defaultMessage: 'Dependencies',
        }),
        searchBarOptions: {
          showTimeComparison: true,
        },
      }),
      '/mobile-services/{serviceName}/service-map': page({
        tabKey: 'service-map',
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
      '/mobile-services/{serviceName}/logs': page({
        tabKey: 'logs',
        title: i18n.translate('xpack.apm.views.logs.title', {
          defaultMessage: 'Logs',
        }),
        element: <ServiceLogs />,
        searchBarOptions: {
          showMobileFilters: false,
          showQueryInput: true,
          searchBarPlaceholder: i18n.translate('xpack.apm.views.logs.searchBarPlaceholder', {
            defaultMessage: 'Search for log entries',
          }),
        },
      }),
      '/mobile-services/{serviceName}/alerts': {
        ...page({
          tabKey: 'alerts',
          title: i18n.translate('xpack.apm.views.alerts.title', {
            defaultMessage: 'Alerts',
          }),
          element: <AlertsOverview />,
          searchBarOptions: {
            showUnifiedSearchBar: false,
            showTimeComparison: false,
            showMobileFilters: false,
          },
          bottomHeaderContent: AlertsHeaderSearchBar,
          contentWrapper: AlertsSearchBarContextProvider,
        }),
        params: z
          .object({
            query: z
              .object({
                alertStatus: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
      },
      '/mobile-services/{serviceName}/dashboards': {
        ...page({
          tabKey: 'dashboards',
          title: i18n.translate('xpack.apm.views.dashboard.title', {
            defaultMessage: 'Dashboards',
          }),
          element: <ServiceDashboards />,
        }),
        params: z
          .object({
            query: z
              .object({
                dashboardId: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
      },
      '/mobile-services/{serviceName}/': {
        element: <RedirectToDefaultServiceRouteView />,
      },
    },
  },
};
