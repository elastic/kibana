/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { EuiSteps, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';
import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useGetOneEnrollmentAPIKey, useLink, useFleetStatus, useGetAgents } from '../../hooks';

import { ManualInstructions } from '../../components/enrollment_instructions';
import { FleetServerRequirementPage } from '../../applications/fleet/sections/agents/agent_requirements_page';

import { FLEET_SERVER_PACKAGE } from '../../constants';

import { policyHasFleetServer } from '../../services';

import {
  getAddFleetServerHostStep,
  getGenerateServiceTokenStep,
  getInstallFleetServerStep,
  getSetDeploymentModeStep,
} from '../../applications/fleet/components/fleet_server_instructions/steps';

import { useAdvancedForm } from '../../applications/fleet/components/fleet_server_instructions/hooks';

import { DownloadStep, AgentPolicySelectionStep, AgentEnrollmentKeySelectionStep } from './steps';
import type { InstructionProps } from './types';

const DefaultMissingRequirements = () => {
  const { getHref } = useLink();

  return (
    <>
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.agentsNotInitializedText"
        defaultMessage="Before enrolling agents, {link}."
        values={{
          link: (
            <EuiLink href={getHref('overview')}>
              <FormattedMessage
                id="xpack.fleet.agentEnrollment.setUpAgentsLink"
                defaultMessage="set up central management for Elastic Agents"
              />
            </EuiLink>
          ),
        }}
      />
    </>
  );
};

const FleetServerMissingRequirements = () => {
  return <FleetServerRequirementPage />;
};

export const ManagedInstructions = React.memo<InstructionProps>(
  ({
    agentPolicy,
    agentPolicies,
    viewDataStep,
    setSelectedPolicyId,
    isFleetServerPolicySelected,
    settings,
    refreshAgentPolicies,
    isLoadingAgentPolicies,
  }) => {
    const fleetStatus = useFleetStatus();

    const [selectedApiKeyId, setSelectedAPIKeyId] = useState<string | undefined>();

    const apiKey = useGetOneEnrollmentAPIKey(selectedApiKeyId);
    const fleetServerInstructions = useAdvancedForm(apiKey?.data?.item?.policy_id);

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

    const fleetServerSteps = useMemo(() => {
      const {
        serviceToken,
        generateServiceToken,
        isLoadingServiceToken,
        deploymentMode,
        setDeploymentMode,
        fleetServerHostForm,
        isFleetServerReady,
      } = fleetServerInstructions;

      return [
        getAddFleetServerHostStep({ fleetServerHostForm, disabled: false }),
        getSetDeploymentModeStep({ deploymentMode, setDeploymentMode, disabled: false }),
        getGenerateServiceTokenStep({ serviceToken, generateServiceToken, isLoadingServiceToken }),
        getInstallFleetServerStep({ serviceToken, isFleetServerReady, disabled: false }),
      ];
    }, [fleetServerInstructions]);

    const steps = useMemo(() => {
      const fleetServerHosts = settings?.fleet_server_hosts || [];
      const baseSteps: EuiContainedStepProps[] = [
        !agentPolicy
          ? AgentPolicySelectionStep({
              agentPolicies,
              selectedApiKeyId,
              setSelectedAPIKeyId,
              setSelectedPolicyId,
              refreshAgentPolicies,
            })
          : AgentEnrollmentKeySelectionStep({ agentPolicy, selectedApiKeyId, setSelectedAPIKeyId }),
        DownloadStep(isFleetServerPolicySelected || false),
      ];
      if (isFleetServerPolicySelected) {
        baseSteps.push(...fleetServerSteps);
      } else {
        baseSteps.push({
          title: i18n.translate('xpack.fleet.agentEnrollment.stepEnrollAndRunAgentTitle', {
            defaultMessage: 'Enroll and start the Elastic Agent',
          }),
          children: selectedApiKeyId && apiKey.data && (
            <ManualInstructions apiKey={apiKey.data.item} fleetServerHosts={fleetServerHosts} />
          ),
        });
      }

      if (viewDataStep) {
        baseSteps.push({ 'data-test-subj': 'view-data-step', ...viewDataStep });
      }

      return baseSteps;
    }, [
      agentPolicy,
      selectedApiKeyId,
      setSelectedPolicyId,
      setSelectedAPIKeyId,
      agentPolicies,
      refreshAgentPolicies,
      apiKey.data,
      fleetServerSteps,
      isFleetServerPolicySelected,
      settings?.fleet_server_hosts,
      viewDataStep,
    ]);

    if (fleetStatus.isReady && settings?.fleet_server_hosts.length === 0) {
      return null;
    }

    if (
      fleetStatus.isReady &&
      (isLoadingAgents || isLoadingAgentPolicies || fleetServers.length > 0)
    ) {
      return (
        <>
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.managedDescription"
              defaultMessage="Enroll an Elastic Agent in Fleet to automatically deploy updates and centrally manage the agent."
            />
          </EuiText>
          <EuiSpacer size="l" />
          <EuiSteps steps={steps} />
        </>
      );
    }

    const showFleetMissingRequirements =
      fleetServers.length === 0 ||
      (fleetStatus.missingRequirements ?? []).some((r) => r === FLEET_SERVER_PACKAGE);

    return (
      <>
        {showFleetMissingRequirements ? (
          <FleetServerMissingRequirements />
        ) : (
          <DefaultMissingRequirements />
        )}
      </>
    );
  }
);
