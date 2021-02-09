/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { ScopedHistory, ApplicationStart } from 'kibana/public';
import { METRIC_TYPE } from '@kbn/analytics';

import { UIM_APP_LOAD } from './constants/ui_metric';
import { EditPolicy } from './sections/edit_policy';
import { PolicyTable } from './sections/policy_table';
import { trackUiMetric } from './services/ui_metric';
import { ROUTES } from './services/navigation';

export const AppWithRouter = ({
  history,
  navigateToApp,
  getUrlForApp,
}: {
  history: ScopedHistory;
  navigateToApp: ApplicationStart['navigateToApp'];
  getUrlForApp: ApplicationStart['getUrlForApp'];
}) => (
  <Router history={history}>
    <App navigateToApp={navigateToApp} getUrlForApp={getUrlForApp} />
  </Router>
);

export const App = ({
  navigateToApp,
  getUrlForApp,
}: {
  navigateToApp: ApplicationStart['navigateToApp'];
  getUrlForApp: ApplicationStart['getUrlForApp'];
}) => {
  useEffect(() => trackUiMetric(METRIC_TYPE.LOADED, UIM_APP_LOAD), []);

  return (
    <Switch>
      <Redirect exact from="/" to={ROUTES.list} />
      <Route
        exact
        path={ROUTES.list}
        render={(props) => <PolicyTable {...props} navigateToApp={navigateToApp} />}
      />
      <Route
        path={ROUTES.edit}
        render={(props) => <EditPolicy {...props} getUrlForApp={getUrlForApp} />}
      />
    </Switch>
  );
};
