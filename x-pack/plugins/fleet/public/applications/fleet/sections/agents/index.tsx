/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { HashRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import { Error, Loading } from '../../components';
import { PAGE_ROUTING_PATHS } from '../../constants';
import { useBreadcrumbs, useCapabilities, useConfig, useFleetStatus } from '../../hooks';
import { WithoutHeaderLayout } from '../../layouts';
import { AgentDetailsPage } from './agent_details_page';
import { AgentListPage } from './agent_list_page';
import { ListLayout } from './components/list_layout';
import { EnrollmentTokenListPage } from './enrollment_token_list_page';
import { NoAccessPage } from './error_pages/no_access';
import { SetupPage } from './setup_page';

export const FleetApp: React.FunctionComponent = () => {
  useBreadcrumbs('fleet');
  const { agents } = useConfig();
  const capabilities = useCapabilities();

  const fleetStatus = useFleetStatus();

  if (!agents.enabled) return null;
  if (fleetStatus.isLoading) {
    return <Loading />;
  }

  if (fleetStatus.error) {
    return (
      <WithoutHeaderLayout>
        <Error
          title={
            <FormattedMessage
              id="xpack.fleet.agentsInitializationErrorMessageTitle"
              defaultMessage="Unable to initialize central management for Elastic Agents"
            />
          }
          error={fleetStatus.error}
        />
      </WithoutHeaderLayout>
    );
  }

  if (fleetStatus.isReady === false) {
    return (
      <SetupPage
        missingRequirements={fleetStatus.missingRequirements || []}
        refresh={fleetStatus.refresh}
      />
    );
  }
  if (!capabilities.read) {
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
