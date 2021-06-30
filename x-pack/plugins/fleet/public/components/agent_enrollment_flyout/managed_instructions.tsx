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

import { useGetOneEnrollmentAPIKey, useGetSettings, useLink, useFleetStatus } from '../../hooks';

import { ManualInstructions } from '../../components/enrollment_instructions';
import {
  deploymentModeStep,
  ServiceTokenStep,
  FleetServerCommandStep,
  useFleetServerInstructions,
  addFleetServerHostStep,
} from '../../applications/fleet/sections/agents/agent_requirements_page/components';
import { FleetServerRequirementPage } from '../../applications/fleet/sections/agents/agent_requirements_page';

import {
  DownloadStep,
  AgentPolicySelectionStep,
  AgentEnrollmentKeySelectionStep,
  ViewDataStep,
} from './steps';
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
  ({ agentPolicy, agentPolicies, viewDataStepContent }) => {
    const fleetStatus = useFleetStatus();

    const [selectedApiKeyId, setSelectedAPIKeyId] = useState<string | undefined>();
    const [isFleetServerPolicySelected, setIsFleetServerPolicySelected] = useState<boolean>(false);

    const apiKey = useGetOneEnrollmentAPIKey(selectedApiKeyId);
    const settings = useGetSettings();
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
      const fleetServerHosts = settings.data?.item?.fleet_server_hosts || [];
      const baseSteps: EuiContainedStepProps[] = [
        DownloadStep(),
        !agentPolicy
          ? AgentPolicySelectionStep({
              agentPolicies,
              selectedApiKeyId,
              setSelectedAPIKeyId,
              setIsFleetServerPolicySelected,
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

      if (viewDataStepContent) {
        baseSteps.push(ViewDataStep(viewDataStepContent));
      }

      return baseSteps;
    }, [
      agentPolicy,
      selectedApiKeyId,
      setSelectedAPIKeyId,
      viewDataStepContent,
      agentPolicies,
      apiKey.data,
      fleetServerSteps,
      isFleetServerPolicySelected,
      settings.data?.item?.fleet_server_hosts,
    ]);

    return (
      <>
        {fleetStatus.isReady ? (
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
        ) : fleetStatus.missingRequirements?.length === 1 &&
          fleetStatus.missingRequirements[0] === 'fleet_server' ? (
          <FleetServerMissingRequirements />
        ) : (
          <DefaultMissingRequirements />
        )}
      </>
    );
  }
);
