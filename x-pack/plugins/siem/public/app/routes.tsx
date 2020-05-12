/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';
import React, { FC, memo } from 'react';
import { Route, Router, Switch } from 'react-router-dom';

import { NotFoundPage } from './404';
import { HomePage } from './home';
import { ManageRoutesSpy } from '../common/utils/route/manage_spy_routes';

interface RouterProps {
  history: History;
  subPluginRoutes: JSX.Element[];
}

const PageRouterComponent: FC<RouterProps> = ({ history, subPluginRoutes }) => (
  <ManageRoutesSpy>
    <Router history={history}>
      <Switch>
        <Route path="/">
          <HomePage subPlugins={subPluginRoutes} />
        </Route>
        <Route>
          <NotFoundPage />
        </Route>
      </Switch>
    </Router>
  </ManageRoutesSpy>
);

export const PageRouter = memo(PageRouterComponent);
