/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiBreadcrumbs
} from '@elastic/eui';
import { withRouter } from 'react-router-dom';
import { routeList } from '../../routes';

function doesPathMatchRoute(path, route) {
  return route.path === path; // this won't scale
}

const BreadcrumbsComponent = ({ location }) => {
  const route = routeList.find(route => doesPathMatchRoute(location.pathname, route));
  if (!route) {
    return null;
  }

  const breadcrumbs = route.breadcrumbs.map(breadcrumb => ({
    ...breadcrumb,
    truncate: true
  }));

  return (
    <EuiBreadcrumbs
      breadcrumbs={breadcrumbs}
    />
  );
};

export const Breadcrumbs = withRouter(BreadcrumbsComponent);
