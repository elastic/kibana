/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Router, Route, Switch, useHistory } from 'react-router-dom';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPortal } from '@elastic/eui';

import { FLEET_ROUTING_PATHS } from '../../constants';
import { Loading, Error, AgentEnrollmentFlyout } from '../../components';
import { useConfig, useFleetStatus, useBreadcrumbs, useAuthz, useGetSettings } from '../../hooks';
import { DefaultLayout, WithoutHeaderLayout } from '../../layouts';

import { AgentListPage } from './agent_list_page';
import { FleetServerRequirementPage, MissingESRequirementsPage } from './agent_requirements_page';
import { AgentDetailsPage } from './agent_details_page';
import { NoAccessPage } from './error_pages/no_access';
import { FleetServerUpgradeModal } from './components/fleet_server_upgrade_modal';

export const AgentsApp: React.FunctionComponent = () => {
  useBreadcrumbs('agent_list');
  const history = useHistory();
  const { agents } = useConfig();
  const hasFleetAllPrivileges = useAuthz().fleet.all;
  const fleetStatus = useFleetStatus();

  const settings = useGetSettings();

  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState(false);
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
  if (!hasFleetAllPrivileges) {
    return <NoAccessPage />;
  }

  const rightColumn = hasOnlyFleetServerMissingRequirement ? (
    <>
      {isEnrollmentFlyoutOpen && (
        <EuiPortal>
          <AgentEnrollmentFlyout
            defaultMode="standalone"
            onClose={() => setIsEnrollmentFlyoutOpen(false)}
          />
        </EuiPortal>
      )}
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="plusInCircle"
            onClick={() => setIsEnrollmentFlyoutOpen(true)}
            data-test-subj="addAgentBtnTop"
          >
            <FormattedMessage id="xpack.fleet.addAgentButton" defaultMessage="Add Agent" />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  ) : undefined;

  return (
    <Router history={history}>
      <Switch>
        <Route path={FLEET_ROUTING_PATHS.agent_details}>
          <AgentDetailsPage />
        </Route>
        <Route path={FLEET_ROUTING_PATHS.agents}>
          <DefaultLayout section="agents" rightColumn={rightColumn}>
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
