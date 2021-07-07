/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ServiceOverview } from '../../app/service_overview';
import { ApmServiceTemplate } from '../templates/apm_service_template';
import { RedirectToDefaultServiceRouteView } from './redirect_to_default_service_route_view';
import { TransactionOverview } from '../../app/transaction_overview';
import { ApmServiceWrapper } from './apm_service_wrapper';
import { ErrorGroupOverview } from '../../app/error_group_overview';

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
  element: React.ReactElement;
  searchBarOptions?: {
    showTransactionTypeSelector?: boolean;
    showTimeComparison?: boolean;
  };
}): {
  element: React.ReactElement;
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
    t.partial({
      query: t.partial({
        environment: t.string,
        rangeFrom: t.string,
        rangeTo: t.string,
        comparisonEnabled: t.string,
        comparisonType: t.string,
        latencyAggregationType: t.string,
        transactionType: t.string,
        kuery: t.string,
      }),
    }),
  ]),
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
    page({
      path: '/transactions',
      tab: 'transactions',
      title: i18n.translate('xpack.apm.views.transactions.title', {
        defaultMessage: 'Transactions',
      }),
      element: <TransactionOverview />,
      searchBarOptions: {
        showTransactionTypeSelector: true,
      },
    }),
    {
      ...page({
        path: '/errors',
        tab: 'errors',
        title: i18n.translate('xpack.apm.views.errors.title', {
          defaultMessage: 'Errors',
        }),
        element: <ErrorGroupOverview />,
      }),
      params: t.partial({
        query: t.partial({
          sortDirection: t.string,
          sortField: t.string,
          pageSize: t.string,
          page: t.string,
        }),
      }),
    },
    {
      path: '/',
      element: <RedirectToDefaultServiceRouteView />,
    },
  ],
} as const;
