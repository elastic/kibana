/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPortal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Route, Router, Switch, useHistory } from 'react-router-dom';

import { AgentEnrollmentFlyout } from '../../../../components/agent_enrollment_flyout';
import { Error } from '../../../../components/error';
import { Loading } from '../../../../components/loading';
import { FLEET_ROUTING_PATHS } from '../../../../constants/page_paths';
import { useCapabilities } from '../../../../hooks/use_capabilities';
import { useConfig } from '../../../../hooks/use_config';
import { useFleetStatus } from '../../../../hooks/use_fleet_status';
import { useGetAgentPolicies } from '../../../../hooks/use_request/agent_policy';
import { useGetSettings } from '../../../../hooks/use_request/settings';
import { WithoutHeaderLayout } from '../../../../layouts/without_header';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { DefaultLayout } from '../../layouts/default/default';

import { AgentDetailsPage } from './agent_details_page';
import { AgentListPage } from './agent_list_page';
import { MissingESRequirementsPage } from './agent_requirements_page/es_requirements_page';
import { FleetServerRequirementPage } from './agent_requirements_page/fleet_server_requirement_page';
import { FleetServerUpgradeModal } from './components/fleet_server_upgrade_modal';
import { NoAccessPage } from './error_pages/no_access';

export const AgentsApp: React.FunctionComponent = () => {
  useBreadcrumbs('agent_list');
  const history = useHistory();
  const { agents } = useConfig();
  const capabilities = useCapabilities();

  const agentPoliciesRequest = useGetAgentPolicies({
    page: 1,
    perPage: 1000,
  });

  const agentPolicies = useMemo(() => agentPoliciesRequest.data?.items || [], [
    agentPoliciesRequest.data,
  ]);

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
  if (!capabilities.read) {
    return <NoAccessPage />;
  }

  const rightColumn = hasOnlyFleetServerMissingRequirement ? (
    <>
      {isEnrollmentFlyoutOpen && (
        <EuiPortal>
          <AgentEnrollmentFlyout
            defaultMode="standalone"
            agentPolicies={agentPolicies}
            onClose={() => setIsEnrollmentFlyoutOpen(false)}
          />
        </EuiPortal>
      )}
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton fill iconType="plusInCircle" onClick={() => setIsEnrollmentFlyoutOpen(true)}>
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
