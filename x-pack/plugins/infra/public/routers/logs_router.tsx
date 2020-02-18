/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Router, Switch } from 'react-router-dom';

import { NotFoundPage } from '../pages/404';
import { LinkToPage } from '../pages/link_to';
import { LogsPage } from '../pages/logs';
import { RedirectWithQueryParams } from '../utils/redirect_with_query_params';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { AppRouter } from './index';

export const LogsRouter: AppRouter = ({ history }) => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  return (
    <Router history={history}>
      <Switch>
        <Route path="/link-to" component={LinkToPage} />
        {uiCapabilities?.logs?.show && (
          <RedirectWithQueryParams from="/" exact={true} to="/stream" />
        )}
        {uiCapabilities?.logs?.show && <Route path="/" component={LogsPage} />}
        <Route component={NotFoundPage} />
      </Switch>
    </Router>
  );
};
