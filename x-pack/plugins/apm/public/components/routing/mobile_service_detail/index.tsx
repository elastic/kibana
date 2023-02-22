/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import { Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { offsetRt } from '../../../../common/comparison_rt';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { environmentRt } from '../../../../common/environment_rt';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { TimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { AlertsOverview } from '../../app/alerts_overview';
import { ServiceMapServiceDetail } from '../../app/service_map';
import { MobileServiceTemplate } from '../templates/mobile_service_template';
import { MobileServiceOverview } from '../../app/mobile/service_overview';
import { MobileTransactionOverview } from '../../app/mobile/transaction_overview';
import { TransactionDetails } from '../../app/transaction_details';
import { RedirectToDefaultServiceRouteView } from '../service_detail/redirect_to_default_service_route_view';

export function page({
  title,
  tab,
  element,
  searchBarOptions,
}: {
  title: string;
  tab: React.ComponentProps<typeof MobileServiceTemplate>['selectedTab'];
  element: React.ReactElement<any, any>;
  searchBarOptions?: {
    showKueryBar?: boolean;
    showTransactionTypeSelector?: boolean;
    showTimeComparison?: boolean;
    showMobileFilters?: boolean;
    hidden?: boolean;
  };
}): {
  element: React.ReactElement<any, any>;
} {
  return {
    element: (
      <MobileServiceTemplate
        title={title}
        selectedTab={tab}
        searchBarOptions={searchBarOptions}
      >
        {element}
      </MobileServiceTemplate>
    ),
  };
}

export const mobileServiceDetail = {
  '/mobile-services/{serviceName}': {
    element: (
      <TimeRangeMetadataContextProvider>
        <Outlet />
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
      '/mobile-services/{serviceName}/overview': {
        ...page({
          element: <MobileServiceOverview />,
          tab: 'overview',
          title: i18n.translate('xpack.apm.views.overview.title', {
            defaultMessage: 'Overview',
          }),
          searchBarOptions: {
            showTransactionTypeSelector: true,
            showTimeComparison: true,
            showMobileFilters: true,
          },
        }),
        params: t.partial({
          query: t.partial({
            page: toNumberRt,
            pageSize: toNumberRt,
            sortField: t.string,
            sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
            device: t.string,
            osVersion: t.string,
            appVersion: t.string,
            netConnectionType: t.string,
          }),
        }),
      },
      '/mobile-services/{serviceName}/transactions': {
        ...page({
          tab: 'transactions',
          title: i18n.translate('xpack.apm.views.transactions.title', {
            defaultMessage: 'Transactions',
          }),
          element: <Outlet />,
          searchBarOptions: {
            showTransactionTypeSelector: true,
            showTimeComparison: true,
            showMobileFilters: true,
          },
        }),
        params: t.partial({
          query: t.partial({
            page: toNumberRt,
            pageSize: toNumberRt,
            sortField: t.string,
            sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
            device: t.string,
            osVersion: t.string,
            appVersion: t.string,
            netConnectionType: t.string,
          }),
        }),
        children: {
          '/mobile-services/{serviceName}/transactions/view': {
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
          '/mobile-services/{serviceName}/transactions': {
            element: <MobileTransactionOverview />,
          },
        },
      },
      '/mobile-services/{serviceName}/service-map': page({
        tab: 'service-map',
        title: i18n.translate('xpack.apm.views.serviceMap.title', {
          defaultMessage: 'Service Map',
        }),
        element: <ServiceMapServiceDetail />,
        searchBarOptions: {
          hidden: true,
        },
      }),
      '/mobile-services/{serviceName}/alerts': page({
        tab: 'alerts',
        title: i18n.translate('xpack.apm.views.alerts.title', {
          defaultMessage: 'Alerts',
        }),
        element: <AlertsOverview />,
        searchBarOptions: {
          hidden: true,
        },
      }),
      '/mobile-services/{serviceName}/': {
        element: <RedirectToDefaultServiceRouteView />,
      },
    },
  },
};
