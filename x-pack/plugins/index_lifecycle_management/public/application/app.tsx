/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { ScopedHistory } from 'kibana/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { useExecutionContext } from 'src/plugins/kibana_react/public';

import { useKibana } from '../shared_imports';
import { UIM_APP_LOAD } from './constants';
import { EditPolicy } from './sections/edit_policy';
import { PolicyList } from './sections/policy_list';
import { trackUiMetric } from './services/ui_metric';
import { ROUTES } from './services/navigation';

export const App = ({ history }: { history: ScopedHistory }) => {
  const {
    services: { executionContext },
  } = useKibana();

  useEffect(() => trackUiMetric(METRIC_TYPE.LOADED, UIM_APP_LOAD), []);

  useExecutionContext(executionContext!, {
    type: 'application',
    page: 'indexLifecycleManagement',
  });

  return (
    <Router history={history}>
      <Switch>
        <Redirect exact from="/" to={ROUTES.list} />
        <Route exact path={ROUTES.list} component={PolicyList} />
        <Route path={ROUTES.edit} component={EditPolicy} />
      </Switch>
    </Router>
  );
};
