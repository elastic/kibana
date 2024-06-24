/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { Outlet } from '@kbn/typed-react-router-config';
import { toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import React from 'react';
import * as t from 'io-ts';
import { ApmTimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { LogsServiceTemplate } from '../templates/logs_service_template';
import { environmentRt } from '../../../../common/environment_rt';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { MobileServiceOverview } from '../../app/mobile/service_overview';

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

export const logsServiceDetailRoute = {
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
          element: <MobileServiceOverview />,
          tabKey: 'overview',
          title: i18n.translate('xpack.apm.views.overview.title', {
            defaultMessage: 'Overview',
          }),
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
    },
  },
};
