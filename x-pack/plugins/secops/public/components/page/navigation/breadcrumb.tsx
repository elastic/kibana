/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore: EuiBreadcrumbs has no exported member
  EuiBreadcrumbs,
  EuiFlexItem,
} from '@elastic/eui';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { pure } from 'recompose';

import { getBreadcrumbs as getHostBreadcrumbs } from '../../../pages/hosts/host_details';
import { getBreadcrumbs as getNetworkBreadcrumbs } from '../../../pages/network/network_details';

import { Navigation } from '.';

const getBreadcrumbsForRoute = (pathname: string) => {
  if (pathname.match(/hosts\/.*?/)) {
    return getHostBreadcrumbs(pathname.match(/([^\/]+$)/)![0]);
  } else if (pathname.match(/network\/ip\/.*?/)) {
    return getNetworkBreadcrumbs(pathname.match(/([^\/]+$)/)![0]);
  }
};

const HeaderBreadcrumbsComponent = pure<RouteComponentProps>(({ location }) => (
  <EuiFlexItem grow={false} data-test-subj="datePickerContainer">
    {location.pathname.match(/[hosts|overview|network]?/) && (
      <Navigation data-test-subj="navigation" />
    )}
    {getBreadcrumbsForRoute(location.pathname) && (
      <EuiBreadcrumbs breadcrumbs={getBreadcrumbsForRoute(location.pathname)} />
    )}
  </EuiFlexItem>
));

export const HeaderBreadcrumbs = withRouter(HeaderBreadcrumbsComponent);
