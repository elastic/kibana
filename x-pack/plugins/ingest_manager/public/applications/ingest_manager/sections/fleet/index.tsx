/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { HashRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import { Loading } from '../../components';
import { useConfig, useCore, useRequest } from '../../hooks';
import { AgentListPage } from './agent_list_page';
import { SetupPage } from './setup_page';
import { AgentDetailsPage } from './agent_details_page';
import { NoAccessPage } from './error_pages/no_access';
import { fleetSetupRouteService } from '../../services';

export const FleetApp: React.FunctionComponent = () => {
  const core = useCore();
  const { fleet } = useConfig();

  const setupRequest = useRequest({
    method: 'get',
    path: fleetSetupRouteService.getFleetSetupPath(),
  });

  if (!fleet.enabled) return null;
  if (setupRequest.isLoading) {
    return <Loading />;
  }

  if (setupRequest.data.isInitialized === false) {
    return (
      <SetupPage
        refresh={async () => {
          await setupRequest.sendRequest();
        }}
      />
    );
  }
  if (!core.application.capabilities.ingestManager.read) {
    return <NoAccessPage />;
  }

  return (
    <Router>
      <Switch>
        <Route path="/fleet" exact={true} render={() => <Redirect to="/fleet/agents" />} />
        <Route path="/fleet/agents/:agentId">
          <AgentDetailsPage />
        </Route>
        <Route path="/fleet/agents">
          <AgentListPage />
        </Route>
      </Switch>
    </Router>
  );
};
