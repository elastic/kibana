/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';

import { StringMap } from '../../../../typings/common';
import { legacyDecodeURIComponent } from '../../../utils/url';
// @ts-ignore
import ErrorGroupDetails from '../ErrorGroupDetails';
// @ts-ignore
import ErrorGroupOverview from '../ErrorGroupOverview';
import { TransactionDetails } from '../TransactionDetails';
// @ts-ignore
import TransactionOverview from '../TransactionOverview';
import { Home } from './Home';

interface BreadcrumbArgs {
  match: {
    params: StringMap<any>;
  };
}

interface RenderArgs {
  location: StringMap<any>;
}

export const routes = [
  {
    exact: true,
    path: '/',
    component: Home,
    breadcrumb: 'APM'
  },
  {
    exact: true,
    path: '/:serviceName/errors/:groupId',
    component: ErrorGroupDetails,
    breadcrumb: ({ match }: BreadcrumbArgs) => match.params.groupId
  },
  {
    exact: true,
    path: '/:serviceName/errors',
    component: ErrorGroupOverview,
    breadcrumb: 'Errors'
  },
  {
    switch: true,
    routes: [
      {
        exact: true,
        path: '/invalid-license',
        breadcrumb: 'Invalid License',
        render: () => <div>Invalid license</div>
      },
      {
        exact: true,
        path: '/:serviceName',
        breadcrumb: ({ match }: BreadcrumbArgs) => match.params.serviceName,
        render: ({ location }: RenderArgs) => {
          return (
            <Redirect
              to={{
                ...location,
                pathname: `${location.pathname}/transactions`
              }}
            />
          );
        }
      }
    ]
  },
  {
    exact: true,
    path: '/:serviceName/transactions',
    component: TransactionOverview,
    breadcrumb: 'Transactions'
  },
  {
    exact: true,
    path: '/:serviceName/transactions/:transactionType',
    component: TransactionOverview,
    breadcrumb: ({ match }: BreadcrumbArgs) =>
      legacyDecodeURIComponent(match.params.transactionType)
  },
  {
    exact: true,
    path: '/:serviceName/transactions/:transactionType/:transactionName',
    component: TransactionDetails,
    breadcrumb: ({ match }: BreadcrumbArgs) =>
      legacyDecodeURIComponent(match.params.transactionName)
  }
];
