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
import { FormattedMessage } from '@kbn/i18n/react';

import { useGetOneEnrollmentAPIKey, useLink, useFleetStatus } from '../../hooks';

import { ManualInstructions } from '../../components/enrollment_instructions';
import {
  deploymentModeStep,
  ServiceTokenStep,
  FleetServerCommandStep,
  useFleetServerInstructions,
  addFleetServerHostStep,
} from '../../applications/fleet/sections/agents/agent_requirements_page/components';
import { FleetServerRequirementPage } from '../../applications/fleet/sections/agents/agent_requirements_page';

import { DownloadStep, AgentPolicySelectionStep, AgentEnrollmentKeySelectionStep } from './steps';
import type { BaseProps } from './types';

type Props = BaseProps;

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

export const ManagedInstructions = React.memo<Props>(
  ({
    agentPolicy,
    agentPolicies,
    viewDataStep,
    setSelectedPolicyId,
    isFleetServerPolicySelected,
    settings,
  }) => {
    const fleetStatus = useFleetStatus();

    const [selectedApiKeyId, setSelectedAPIKeyId] = useState<string | undefined>();

    const apiKey = useGetOneEnrollmentAPIKey(selectedApiKeyId);
    const fleetServerInstructions = useFleetServerInstructions(apiKey?.data?.item?.policy_id);

    const fleetServerSteps = useMemo(() => {
      const {
        serviceToken,
        getServiceToken,
        isLoadingServiceToken,
        installCommand,
        platform,
        setPlatform,
        deploymentMode,
        setDeploymentMode,
        addFleetServerHost,
      } = fleetServerInstructions;

      return [
        deploymentModeStep({ deploymentMode, setDeploymentMode }),
        addFleetServerHostStep({ addFleetServerHost }),
        ServiceTokenStep({ serviceToken, getServiceToken, isLoadingServiceToken }),
        FleetServerCommandStep({ serviceToken, installCommand, platform, setPlatform }),
      ];
    }, [fleetServerInstructions]);

    const steps = useMemo(() => {
      const fleetServerHosts = settings?.fleet_server_hosts || [];
      const baseSteps: EuiContainedStepProps[] = [
        DownloadStep(),
        !agentPolicy
          ? AgentPolicySelectionStep({
              agentPolicies,
              selectedApiKeyId,
              setSelectedAPIKeyId,
              setSelectedPolicyId,
            })
          : AgentEnrollmentKeySelectionStep({ agentPolicy, selectedApiKeyId, setSelectedAPIKeyId }),
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
      apiKey.data,
      fleetServerSteps,
      isFleetServerPolicySelected,
      settings?.fleet_server_hosts,
      viewDataStep,
    ]);

    if (fleetStatus.isReady && settings?.fleet_server_hosts.length === 0) {
      return null;
    }

    if (fleetStatus.isReady) {
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

    return (
      <>
        {fleetStatus.missingRequirements?.length === 1 &&
        fleetStatus.missingRequirements[0] === 'fleet_server' ? (
          <FleetServerMissingRequirements />
        ) : (
          <DefaultMissingRequirements />
        )}
      </>
    );
  }
);
