/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { HashRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import { Loading } from '../../components';
import { useRequest } from '../../hooks';
import { AgentListPage } from './agent_list_page';
import { SetupPage } from './setup_page';
import { AgentDetailsPage } from './agent_details_page';

export const FleetApp: React.FC = () => {
  const setupRequest = useRequest({
    method: 'get',
    path: '/api/ingest_manager/fleet/setup',
  });

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
