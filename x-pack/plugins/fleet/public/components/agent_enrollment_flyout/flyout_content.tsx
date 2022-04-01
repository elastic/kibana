/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useFleetStatus, useGetAgents } from '../../hooks';

import { FleetServerRequirementPage } from '../../applications/fleet/sections/agents/agent_requirements_page';

import { policyHasFleetServer } from '../../applications/fleet/sections/agents/services/has_fleet_server';

import { FLEET_SERVER_PACKAGE } from '../../constants';

import type { InstructionProps } from './types';

import { ManagedSteps, StandaloneSteps } from './compute_steps';
import { DefaultMissingRequirements } from './default_missing_requirements';

export const FlyoutContent = (props: InstructionProps) => {
  const {
    agentPolicies,
    isFleetServerPolicySelected,
    settings,
    isLoadingAgentPolicies,
    mode,
    setSelectionType,
  } = props;
  const fleetStatus = useFleetStatus();

  const { data: agents, isLoading: isLoadingAgents } = useGetAgents({
    page: 1,
    perPage: 1000,
    showInactive: false,
  });

  const fleetServers = useMemo(() => {
    const fleetServerAgentPolicies: string[] = agentPolicies
      .filter((pol) => policyHasFleetServer(pol))
      .map((pol) => pol.id);
    return (agents?.items ?? []).filter((agent) =>
      fleetServerAgentPolicies.includes(agent.policy_id ?? '')
    );
  }, [agents, agentPolicies]);

  const fleetServerHosts = useMemo(() => {
    return settings?.fleet_server_hosts || [];
  }, [settings]);

  const hasNoFleetServerHost = fleetStatus.isReady && fleetServerHosts.length === 0;
  const showingAgentEnrollment =
    fleetStatus.isReady && (isLoadingAgents || isLoadingAgentPolicies || fleetServers.length > 0);
  const showFleetMissingRequirements =
    fleetServers.length === 0 ||
    (fleetStatus.missingRequirements ?? []).some((r) => r === FLEET_SERVER_PACKAGE);

  if (hasNoFleetServerHost) {
    return null;
  }
  if (showingAgentEnrollment) {
    setSelectionType('radio');
    return (
      <>
        <EuiText>
          {mode === 'managed' ? (
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.managedDescription"
              defaultMessage="Enroll an Elastic Agent in Fleet to automatically deploy updates and centrally manage the agent."
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.standaloneDescription"
              defaultMessage="Run an Elastic Agent standalone to configure and update the agent manually on the host where the agent is installed."
            />
          )}
        </EuiText>
        <EuiSpacer size="l" />
        <ManagedSteps {...props} />
      </>
    );
  }
  setSelectionType('tabs');
  return (
    <>
      {showFleetMissingRequirements ? (
        <FleetServerRequirementPage />
      ) : (
        <DefaultMissingRequirements />
      )}
    </>
  );
};

export const StandaloneFlyout = (props: InstructionProps) => {
  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.standaloneDescription"
          defaultMessage="Run an Elastic Agent standalone to configure and update the agent manually on the host where the agent is installed."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <StandaloneSteps {...props} />
    </>
  );
};
