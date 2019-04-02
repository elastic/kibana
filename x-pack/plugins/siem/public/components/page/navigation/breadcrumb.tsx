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
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { pure } from 'recompose';

import { getBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../pages/hosts/host_details';
import { getBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../pages/network/ip_details';

import { Navigation } from '.';

export interface BreadcrumbItem {
  text: string;
  href?: string;
}

export const getBreadcrumbsForRoute = (pathname: string): BreadcrumbItem[] | null => {
  const trailingPath = pathname.match(/([^\/]+$)/);
  if (trailingPath !== null) {
    if (pathname.match(/hosts\/.*?/)) {
      return getHostDetailsBreadcrumbs(trailingPath[0]);
    } else if (pathname.match(/network\/ip\/.*?/)) {
      return getIPDetailsBreadcrumbs(trailingPath[0]);
    }
  }
  return null;
};

export const HeaderBreadcrumbsComponent = pure<RouteComponentProps>(({ location }) => (
  <EuiFlexItem grow={false} data-test-subj="datePickerContainer">
    {location.pathname.match(/(hosts|overview|network)\/?$/) && (
      <Navigation data-test-subj="navigation" />
    )}
    {getBreadcrumbsForRoute(location.pathname) && (
      <EuiBreadcrumbs breadcrumbs={getBreadcrumbsForRoute(location.pathname)} />
    )}
  </EuiFlexItem>
));

export const HeaderBreadcrumbs = withRouter(HeaderBreadcrumbsComponent);
