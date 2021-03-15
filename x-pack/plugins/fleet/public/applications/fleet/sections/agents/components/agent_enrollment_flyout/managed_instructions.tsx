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
  useStartServices,
  useGetSettings,
  useLink,
  useFleetStatus,
} from '../../../../hooks';
import { ManualInstructions } from '../../../../components/enrollment_instructions';

import { DownloadStep, AgentPolicySelectionStep } from './steps';

interface Props {
  agentPolicies?: AgentPolicy[];
}

export const ManagedInstructions = React.memo<Props>(({ agentPolicies }) => {
  const { getHref } = useLink();
  const core = useStartServices();
  const fleetStatus = useFleetStatus();

  const [selectedAPIKeyId, setSelectedAPIKeyId] = useState<string | undefined>();

  const settings = useGetSettings();
  const apiKey = useGetOneEnrollmentAPIKey(selectedAPIKeyId);

  const kibanaUrlsSettings = settings.data?.item?.kibana_urls;
  const kibanaUrl = kibanaUrlsSettings
    ? kibanaUrlsSettings[0]
    : `${window.location.origin}${core.http.basePath.get()}`;

  const kibanaCASha256 = settings.data?.item?.kibana_ca_sha256;

  const steps: EuiContainedStepProps[] = [
    DownloadStep(),
    AgentPolicySelectionStep({ agentPolicies, setSelectedAPIKeyId }),
    {
      title: i18n.translate('xpack.fleet.agentEnrollment.stepEnrollAndRunAgentTitle', {
        defaultMessage: 'Enroll and start the Elastic Agent',
      }),
      children: apiKey.data && (
        <ManualInstructions
          apiKey={apiKey.data.item}
          kibanaUrl={kibanaUrl}
          kibanaCASha256={kibanaCASha256}
        />
      ),
    },
  ];

  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.managedDescription"
          defaultMessage="Enroll an Elastic Agent in Fleet to automatically deploy updates and centrally manage the agent."
        />
      </EuiText>
      <EuiSpacer size="l" />
      {fleetStatus.isReady ? (
        <>
          <EuiSteps steps={steps} />
        </>
      ) : (
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
      )}
    </>
  );
});
