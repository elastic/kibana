/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';
import React from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';

import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import { NotFoundPage } from './pages/404';
import { HomePage } from './pages/home';
import { LinkToPage } from './pages/link_to';
import { LogsPage } from './pages/logs';
import { MetricDetail } from './pages/metrics';

interface RouterProps {
  history: History;
  uiCapabilities: UICapabilities;
}

const PageRouterComponent: React.SFC<RouterProps> = ({ history, uiCapabilities }) => {
  const defaultRoute = uiCapabilities.infrastructure.show ? '/home' : '/logs';
  return (
    <Router history={history}>
      <Switch>
        <Redirect from="/" exact={true} to={defaultRoute} />
        {uiCapabilities.logs.show && <Route path="/logs" component={LogsPage} />}
        {uiCapabilities.infrastructure.show && <Route path="/home" component={HomePage} />}
        <Route path="/link-to" component={LinkToPage} />
        {uiCapabilities.infrastructure.show && (
          <Route path="/metrics/:type/:node" component={MetricDetail} />
        )}
        <Route component={NotFoundPage} />
      </Switch>
    </Router>
  );
};

export const PageRouter = injectUICapabilities(PageRouterComponent);
