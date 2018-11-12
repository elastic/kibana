/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  // @ts-ignore
  EuiTab,
  // @ts-ignore
  EuiTabs,
} from '@elastic/eui';
import { History } from 'history';
import { capitalize, last } from 'lodash';
import React from 'react';
import { withRouter } from 'react-router-dom';
interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  routes?: RouteConfig[];
}
interface ComponentProps {
  routes: RouteConfig[];
  location: Location;
  history: History;
}

export const ConnectedTabs = withRouter<any>(({ routes, location, history }: ComponentProps) => {
  const tabs = routes.map(route => (
    <EuiTab
      onClick={() => history.push(route.path)}
      isSelected={route.path === location.pathname}
      key={`${route.path}-tab-ui`}
    >
      {capitalize(last(route.path.split('/')).replace(new RegExp('_', 'g'), ' '))}
    </EuiTab>
  ));

  return <EuiTabs>{tabs}</EuiTabs>;
});
