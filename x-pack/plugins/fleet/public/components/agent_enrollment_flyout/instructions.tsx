/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useFleetStatus, useFleetServerStandalone, sendGetAllFleetServerAgents } from '../../hooks';
import { FleetServerRequirementPage } from '../../applications/fleet/sections/agents/agent_requirements_page';
import { FLEET_SERVER_PACKAGE } from '../../constants';
import { useFleetServerUnhealthy } from '../../applications/fleet/sections/agents/hooks/use_fleet_server_unhealthy';
import { Loading } from '..';
import { AdvancedTab } from '../../applications/fleet/components/fleet_server_instructions/advanced_tab';

import type { InstructionProps } from './types';
import { ManagedSteps, StandaloneSteps } from './steps';
import { DefaultMissingRequirements } from './default_missing_requirements';

export const Instructions = (props: InstructionProps) => {
  const {
    isFleetServerPolicySelected,
    fleetServerHosts,
    isLoadingAgentPolicies,
    selectionType,
    setSelectionType,
    mode,
    setMode,
    isIntegrationFlow,
  } = props;
  const fleetStatus = useFleetStatus();
  const { isUnhealthy: isFleetServerUnhealthy, isLoading: isLoadingFleetServerHealth } =
    useFleetServerUnhealthy();

  const { isFleetServerStandalone } = useFleetServerStandalone();
  const [fleetServerAgentsCount, setFleetServerAgentsCount] = useState<number>(0);
  const [isLoadingAgents, setIsLoadingAgents] = useState<boolean>(true);

  useEffect(() => {
    const fetchFleetServerAgents = async () => {
      try {
        const { fleetServerAgentsCount: count } = await sendGetAllFleetServerAgents(true);
        setFleetServerAgentsCount(count ?? 0);
        setIsLoadingAgents(false);
      } catch (error) {
        return;
      }
    };

    setIsLoadingAgents(true);
    fetchFleetServerAgents();
  }, []);

  const hasNoFleetServerHost = fleetStatus.isReady && (fleetServerHosts?.length ?? 0) === 0;

  const showAgentEnrollment =
    isFleetServerPolicySelected ||
    isFleetServerStandalone ||
    (fleetStatus.isReady &&
      !isFleetServerUnhealthy &&
      fleetServerAgentsCount > 0 &&
      (fleetServerHosts?.length ?? 0) > 0);

  const showFleetServerEnrollment =
    !isFleetServerStandalone &&
    !isFleetServerPolicySelected &&
    (fleetServerAgentsCount === 0 ||
      isFleetServerUnhealthy ||
      (fleetStatus.missingRequirements ?? []).some((r) => r === FLEET_SERVER_PACKAGE));

  useEffect(() => {
    // If we detect a CloudFormation integration, we want to hide the selection type
    if (
      props.cloudSecurityIntegration?.isAzureArmTemplate ||
      props.cloudSecurityIntegration?.isCloudFormation ||
      props.cloudSecurityIntegration?.cloudShellUrl
    ) {
      setSelectionType(undefined);
    } else if (!isIntegrationFlow && showAgentEnrollment) {
      setSelectionType('radio');
    } else {
      setSelectionType('tabs');
    }
  }, [isIntegrationFlow, showAgentEnrollment, setSelectionType, props.cloudSecurityIntegration]);

  if (isLoadingAgents || isLoadingAgentPolicies || isLoadingFleetServerHealth)
    return <Loading size="l" />;

  if (hasNoFleetServerHost) {
    return null;
  }

  if (mode === 'managed') {
    if (showFleetServerEnrollment) {
      return <FleetServerRequirementPage showStandaloneTab={() => setMode('standalone')} />;
    } else if (showAgentEnrollment) {
      return (
        <>
          {selectionType === 'tabs' && !props.cloudSecurityIntegration?.cloudShellUrl && (
            <>
              <EuiText>
                <FormattedMessage
                  id="xpack.fleet.agentEnrollment.managedDescription"
                  defaultMessage="Enroll an Elastic Agent in Fleet to automatically deploy updates and centrally manage the agent."
                />
              </EuiText>
              <EuiSpacer size="l" />
            </>
          )}
          {isFleetServerPolicySelected ? (
            <AdvancedTab selectedPolicyId={props.selectedPolicy?.id} onClose={() => undefined} />
          ) : (
            <ManagedSteps {...props} />
          )}
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
