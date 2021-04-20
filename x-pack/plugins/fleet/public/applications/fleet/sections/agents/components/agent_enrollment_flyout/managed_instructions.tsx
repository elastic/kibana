/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSteps, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';
import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import type { AgentPolicy } from '../../../../types';
import {
  useGetOneEnrollmentAPIKey,
  useGetSettings,
  useLink,
  useFleetStatus,
} from '../../../../hooks';
import { ManualInstructions } from '../../../../components/enrollment_instructions';
import { FleetServerRequirementPage } from '../../agent_requirements_page';

import { DownloadStep, AgentPolicySelectionStep } from './steps';

interface Props {
  agentPolicies?: AgentPolicy[];
}

const DefaultMissingRequirements = () => {
  const { getHref } = useLink();

  return (
    <>
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.agentsNotInitializedText"
        defaultMessage="Before enrolling agents, {link}."
        values={{
          link: (
            <EuiLink href={getHref('fleet')}>
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

export const ManagedInstructions = React.memo<Props>(({ agentPolicies }) => {
  const fleetStatus = useFleetStatus();

  const [selectedAPIKeyId, setSelectedAPIKeyId] = useState<string | undefined>();

  const apiKey = useGetOneEnrollmentAPIKey(selectedAPIKeyId);
  const settings = useGetSettings();
  const fleetServerHosts = settings.data?.item?.fleet_server_hosts || [];

  const steps: EuiContainedStepProps[] = [
    DownloadStep(),
    AgentPolicySelectionStep({ agentPolicies, setSelectedAPIKeyId }),
    {
      title: i18n.translate('xpack.fleet.agentEnrollment.stepEnrollAndRunAgentTitle', {
        defaultMessage: 'Enroll and start the Elastic Agent',
      }),
      children: apiKey.data && (
        <ManualInstructions apiKey={apiKey.data.item} fleetServerHosts={fleetServerHosts} />
      ),
    },
  ];

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
});
