/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { legacyDecodeURIComponent } from 'x-pack/plugins/apm/public/components/shared/Links/url_helpers';
import { StringMap } from '../../../../typings/common';
// @ts-ignore
import ErrorGroupDetails from '../ErrorGroupDetails';
import { ServiceDetails } from '../ServiceDetails';
import { TransactionDetails } from '../TransactionDetails';
import { Home } from './Home';

interface BreadcrumbArgs {
  match: {
    params: StringMap;
  };
}

interface RouteParams {
  serviceName: string;
}

const renderAsRedirectTo = (to: string) => {
  return ({ location }: RouteComponentProps<RouteParams>) => (
    <Redirect
      to={{
        ...location,
        pathname: to
      }}
    />
  );
};

export const routes = [
  {
    exact: true,
    path: '/',
    render: renderAsRedirectTo('/services'),
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
    component: ServiceDetails,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.errorsTitle', {
      defaultMessage: 'Errors'
    })
  },
  {
    switch: true,
    routes: [
      {
        exact: true,
        path: '/invalid-license',
        breadcrumb: i18n.translate('xpack.apm.breadcrumb.invalidLicenseTitle', {
          defaultMessage: 'Invalid License'
        }),
        render: () => (
          <div>
            {i18n.translate('xpack.apm.invalidLicenseLabel', {
              defaultMessage: 'Invalid license'
            })}
          </div>
        )
      },
      {
        exact: true,
        path: '/services',
        component: Home,
        breadcrumb: i18n.translate('xpack.apm.breadcrumb.servicesTitle', {
          defaultMessage: 'Services'
        })
      },
      {
        exact: true,
        path: '/traces',
        component: Home,
        breadcrumb: i18n.translate('xpack.apm.breadcrumb.tracesTitle', {
          defaultMessage: 'Traces'
        })
      },
      {
        exact: true,
        path: '/:serviceName',
        breadcrumb: ({ match }: BreadcrumbArgs) => match.params.serviceName,
        render: (props: RouteComponentProps<RouteParams>) =>
          renderAsRedirectTo(`/${props.match.params.serviceName}/transactions`)(
            props
          )
      }
    ]
  },
  {
    exact: true,
    path: '/:serviceName/transactions',
    component: ServiceDetails,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.transactionsTitle', {
      defaultMessage: 'Transactions'
    })
  },
  // Have to split this out as its own route to prevent duplicate breadcrumbs from both matching
  // if we use :transactionType? as a single route here
  {
    exact: true,
    path: '/:serviceName/transactions/:transactionType',
    component: ServiceDetails,
    breadcrumb: null
  },
  {
    exact: true,
    path: '/:serviceName/metrics',
    component: ServiceDetails,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.metricsTitle', {
      defaultMessage: 'Metrics'
    })
  },
  {
    exact: true,
    path: '/:serviceName/transactions/:transactionType/:transactionName',
    component: TransactionDetails,
    breadcrumb: ({ match }: BreadcrumbArgs) =>
      legacyDecodeURIComponent(match.params.transactionName)
  }
];
