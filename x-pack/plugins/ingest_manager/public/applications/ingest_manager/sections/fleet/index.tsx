/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { HashRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import { PAGE_ROUTING_PATHS } from '../../constants';
import { Loading } from '../../components';
import { useConfig, useCore, useFleetStatus, useBreadcrumbs } from '../../hooks';
import { AgentListPage } from './agent_list_page';
import { SetupPage } from './setup_page';
import { AgentDetailsPage } from './agent_details_page';
import { NoAccessPage } from './error_pages/no_access';
import { EnrollmentTokenListPage } from './enrollment_token_list_page';
import { ListLayout } from './components/list_layout';

export const FleetApp: React.FunctionComponent = () => {
  useBreadcrumbs('fleet');
  const core = useCore();
  const { fleet } = useConfig();

  const fleetStatus = useFleetStatus();

  if (!fleet.enabled) return null;
  if (fleetStatus.isLoading) {
    return <Loading />;
  }

  if (fleetStatus.isReady === false) {
    return (
      <SetupPage
        missingRequirements={fleetStatus.missingRequirements || []}
        refresh={fleetStatus.refresh}
      />
    );
  }
  if (!core.application.capabilities.ingestManager.read) {
    return <NoAccessPage />;
  }

  return (
    <Router>
      <Switch>
        <Route
          path={PAGE_ROUTING_PATHS.fleet}
          exact={true}
          render={() => <Redirect to={PAGE_ROUTING_PATHS.fleet_agent_list} />}
        />
        <Route path={PAGE_ROUTING_PATHS.fleet_agent_details}>
          <AgentDetailsPage />
        </Route>
        <Route path={PAGE_ROUTING_PATHS.fleet_agent_list}>
          <ListLayout>
            <AgentListPage />
          </ListLayout>
        </Route>
        <Route path={PAGE_ROUTING_PATHS.fleet_enrollment_tokens}>
          <ListLayout>
            <EnrollmentTokenListPage />
          </ListLayout>
        </Route>
      </Switch>
    </Router>
  );
};
