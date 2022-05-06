/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router, Switch, Route, useHistory } from 'react-router-dom';

import { FLEET_ROUTING_PATHS } from '../../constants';
import { useBreadcrumbs } from '../../hooks';

import { DefaultLayout } from '../../layouts';

import { AgentPolicyListPage } from './list_page';

export const AutodiscoverApp: React.FunctionComponent = () => {
  useBreadcrumbs('policies');
  const history = useHistory();

  return (
    <Router history={history}>
      <Switch>
        <Route path={FLEET_ROUTING_PATHS.autodiscover}>
          <DefaultLayout section="autodiscover">
            <AgentPolicyListPage />
          </DefaultLayout>
        </Route>
      </Switch>
    </Router>
  );
};
