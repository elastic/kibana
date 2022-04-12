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

import { FLEET_SERVER_PACKAGE } from '../../constants';

import { useFleetServerUnhealthy } from '../../applications/fleet/sections/agents/hooks/use_fleet_server_unhealthy';

import { Loading } from '..';

import { policyHasFleetServer } from '../../services';

import { AdvancedTab } from '../../applications/fleet/components/fleet_server_instructions/advanced_tab';

import type { InstructionProps } from './types';

import { ManagedSteps, StandaloneSteps } from './steps';
import { DefaultMissingRequirements } from './default_missing_requirements';

export const Instructions = (props: InstructionProps) => {
  const {
    agentPolicies,
    isFleetServerPolicySelected,
    settings,
    isLoadingAgentPolicies,
    setSelectionType,
    mode,
    isIntegrationFlow,
  } = props;
  const fleetStatus = useFleetStatus();
  const { isUnhealthy: isFleetServerUnhealthy } = useFleetServerUnhealthy();

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

  const showAgentEnrollment =
    fleetStatus.isReady &&
    !isFleetServerUnhealthy &&
    fleetServers.length > 0 &&
    fleetServerHosts.length > 0;

  const showFleetServerEnrollment =
    fleetServers.length === 0 ||
    isFleetServerUnhealthy ||
    (fleetStatus.missingRequirements ?? []).some((r) => r === FLEET_SERVER_PACKAGE);

  if (!isIntegrationFlow && showAgentEnrollment) {
    setSelectionType('radio');
  } else {
    setSelectionType('tabs');
  }

  if (isLoadingAgents || isLoadingAgentPolicies) return <Loading size="l" />;

  if (hasNoFleetServerHost) {
    return null;
  }

  if (mode === 'managed') {
    if (showFleetServerEnrollment) {
      return <FleetServerRequirementPage />;
    } else if (showAgentEnrollment) {
      return (
        <>
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.managedDescription"
              defaultMessage="Enroll an Elastic Agent in Fleet to automatically deploy updates and centrally manage the agent."
            />
          </EuiText>
          <EuiSpacer size="l" />
          {isFleetServerPolicySelected ? <AdvancedTab /> : <ManagedSteps {...props} />}
        </>
      );
    }
    return <DefaultMissingRequirements />;
  } else {
    return <StandaloneInstructions {...props} />;
  }
};

const StandaloneInstructions = (props: InstructionProps) => {
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
