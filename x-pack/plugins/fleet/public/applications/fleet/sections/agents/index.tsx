/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { HashRouter as Router, Route, Switch } from 'react-router-dom';

import { FLEET_ROUTING_PATHS } from '../../constants';
import { Loading, Error } from '../../components';
import {
  useConfig,
  useFleetStatus,
  useBreadcrumbs,
  useCapabilities,
  useGetSettings,
} from '../../hooks';
import { DefaultLayout, WithoutHeaderLayout } from '../../layouts';

import { AgentListPage } from './agent_list_page';
import { FleetServerRequirementPage, MissingESRequirementsPage } from './agent_requirements_page';
import { AgentDetailsPage } from './agent_details_page';
import { NoAccessPage } from './error_pages/no_access';
import { FleetServerUpgradeModal } from './components/fleet_server_upgrade_modal';

const REFRESH_INTERVAL_MS = 30000;

export const AgentsApp: React.FunctionComponent = () => {
  useBreadcrumbs('agent_list');

  const { agents } = useConfig();
  const capabilities = useCapabilities();

  const fleetStatus = useFleetStatus();

  const settings = useGetSettings();

  const [fleetServerModalVisible, setFleetServerModalVisible] = useState(false);
  const onCloseFleetServerModal = useCallback(() => {
    setFleetServerModalVisible(false);
  }, [setFleetServerModalVisible]);

  useEffect(() => {
    // if it's undefined do not show the modal
    if (settings.data && settings.data?.item.has_seen_fleet_migration_notice === false) {
      setFleetServerModalVisible(true);
    }
  }, [settings.data]);

  useEffect(() => {
    if (
      !agents.enabled ||
      fleetStatus.isLoading ||
      !fleetStatus.missingRequirements ||
      !fleetStatus.missingRequirements.includes('fleet_server')
    ) {
      return;
    }

    const interval = setInterval(() => {
      fleetStatus.refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [fleetStatus, agents.enabled]);

  if (!agents.enabled) return null;
  if (!fleetStatus.missingRequirements && fleetStatus.isLoading) {
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

  const hasOnlyFleetServerMissingRequirement =
    fleetStatus?.missingRequirements?.length === 1 &&
    fleetStatus.missingRequirements[0] === 'fleet_server';

  if (
    !hasOnlyFleetServerMissingRequirement &&
    fleetStatus.missingRequirements &&
    fleetStatus.missingRequirements.length > 0
  ) {
    return <MissingESRequirementsPage missingRequirements={fleetStatus.missingRequirements} />;
  }
  if (!capabilities.read) {
    return <NoAccessPage />;
  }

  return (
    <Router>
      <Switch>
        <Route path={FLEET_ROUTING_PATHS.agent_details}>
          <AgentDetailsPage />
        </Route>
        <Route path={FLEET_ROUTING_PATHS.agents}>
          <DefaultLayout section="agents">
            {fleetServerModalVisible && (
              <FleetServerUpgradeModal onClose={onCloseFleetServerModal} />
            )}
            {hasOnlyFleetServerMissingRequirement ? (
              <FleetServerRequirementPage />
            ) : (
              <AgentListPage />
            )}
          </DefaultLayout>
        </Route>
      </Switch>
    </Router>
  );
};
