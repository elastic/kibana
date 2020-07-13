/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { ScopedHistory, ApplicationStart, ChromeDocTitle } from 'kibana/public';
import { METRIC_TYPE } from '@kbn/analytics';

import { PLUGIN } from '../../common/constants';
import { UIM_APP_LOAD } from './constants';
import { EditPolicy } from './sections/edit_policy';
import { PolicyTable } from './sections/policy_table';
import { trackUiMetric } from './services/ui_metric';

export const App = ({
  history,
  navigateToApp,
  docTitle,
}: {
  history: ScopedHistory;
  navigateToApp: ApplicationStart['navigateToApp'];
  docTitle: ChromeDocTitle;
}) => {
  useEffect(() => trackUiMetric(METRIC_TYPE.LOADED, UIM_APP_LOAD), []);

  useEffect(() => {
    docTitle.change(PLUGIN.TITLE);
    return () => docTitle.reset();
  }, [docTitle]);

  return (
    <Router history={history}>
      <Switch>
        <Redirect exact from="/" to="/policies" />
        <Route
          exact
          path={`/policies`}
          render={(props) => <PolicyTable {...props} navigateToApp={navigateToApp} />}
        />
        <Route path={`/policies/edit/:policyName?`} component={EditPolicy} />
      </Switch>
    </Router>
  );
};
