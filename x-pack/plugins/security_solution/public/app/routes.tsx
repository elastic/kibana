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
import { RouteCapture } from '../common/components/endpoint/route_capture';
import { useWithSource } from '../common/containers/source/index';

/* Uncomment only during debugging */
// const whyDidYouRender = require('@welldone-software/why-did-you-render'); // eslint-disable-line
// whyDidYouRender(React, {
//   exclude: [/^ColumnHeadersComponent/, /^Connect/],
//   trackAllPureComponents: false,
//   trackHooks: false,
//   trackExtraHooks: [[useWithSource]],
// });

interface RouterProps {
  history: History;
  subPluginRoutes: JSX.Element[];
}

const PageRouterComponent: FC<RouterProps> = ({ history, subPluginRoutes }) => (
  <ManageRoutesSpy>
    <Router history={history}>
      <RouteCapture>
        <Switch>
          <Route path="/">
            <HomePage subPlugins={subPluginRoutes} />
          </Route>
          <Route>
            <NotFoundPage />
          </Route>
        </Switch>
      </RouteCapture>
    </Router>
  </ManageRoutesSpy>
);

export const PageRouter = memo(PageRouterComponent);
