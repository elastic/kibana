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
import { LogsServiceTemplate } from '../../templates/entities/logs_service_template';
import { offsetRt } from '../../../../../common/comparison_rt';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { environmentRt } from '../../../../../common/environment_rt';
import { ApmTimeRangeMetadataContextProvider } from '../../../../context/time_range_metadata/time_range_metadata_context';
import { ServiceDashboards } from '../../../app/service_dashboards';
import { ServiceLogs } from '../../../app/service_logs';
import { LogsServiceOverview } from '../../../app/entities/logs/logs_service_overview';
import { RedirectToDefaultLogsServiceRouteView } from '../../service_detail/redirect_to_default_service_route_view';

export function page({
  title,
  tabKey,
  element,
  searchBarOptions,
}: {
  title: string;
  tabKey: React.ComponentProps<typeof LogsServiceTemplate>['selectedTabKey'];
  element: React.ReactElement<any, any>;
  searchBarOptions?: {
    showUnifiedSearchBar?: boolean;
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
      <LogsServiceTemplate
        title={title}
        selectedTabKey={tabKey}
        searchBarOptions={searchBarOptions}
      >
        {element}
      </LogsServiceTemplate>
    ),
  };
}

export const logsServiceDetailsRoute = {
  '/logs-services/{serviceName}': {
    element: (
      <ApmTimeRangeMetadataContextProvider>
        <Outlet />
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
      },
    },
    children: {
      '/logs-services/{serviceName}/overview': {
        ...page({
          element: <LogsServiceOverview />,
          tabKey: 'overview',
          title: i18n.translate('xpack.apm.views.overview.title', {
            defaultMessage: 'Overview',
          }),
          searchBarOptions: {
            showUnifiedSearchBar: true,
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
      '/logs-services/{serviceName}/logs': {
        ...page({
          tabKey: 'logs',
          title: i18n.translate('xpack.apm.views.logs.title', {
            defaultMessage: 'Logs',
          }),
          element: <ServiceLogs />,
          searchBarOptions: {
            showUnifiedSearchBar: false,
          },
        }),
      },
      '/logs-services/{serviceName}/dashboards': {
        ...page({
          tabKey: 'dashboards',
          title: i18n.translate('xpack.apm.views.dashboard.title', {
            defaultMessage: 'Dashboards',
          }),
          element: <ServiceDashboards checkForEntities />,
          searchBarOptions: {
            showUnifiedSearchBar: false,
          },
        }),
        params: t.partial({
          query: t.partial({
            dashboardId: t.string,
          }),
        }),
      },
      '/logs-services/{serviceName}/': {
        element: <RedirectToDefaultLogsServiceRouteView />,
      },
    },
  },
};
