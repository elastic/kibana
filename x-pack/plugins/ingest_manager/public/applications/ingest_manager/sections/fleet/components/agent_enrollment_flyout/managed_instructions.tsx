/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiSteps, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentConfig } from '../../../../types';
import {
  useGetOneEnrollmentAPIKey,
  useCore,
  useGetSettings,
  useLink,
  useFleetStatus,
} from '../../../../hooks';
import { ManualInstructions } from '../../../../components/enrollment_instructions';
import { DownloadStep, AgentConfigSelectionStep } from './steps';

interface Props {
  agentConfigs?: AgentConfig[];
}

export const ManagedInstructions: React.FunctionComponent<Props> = ({ agentConfigs }) => {
  const { getHref } = useLink();
  const core = useCore();
  const fleetStatus = useFleetStatus();

  const [selectedAPIKeyId, setSelectedAPIKeyId] = useState<string | undefined>();

  const settings = useGetSettings();
  const apiKey = useGetOneEnrollmentAPIKey(selectedAPIKeyId);

  const kibanaUrl =
    settings.data?.item?.kibana_url ?? `${window.location.origin}${core.http.basePath.get()}`;
  const kibanaCASha256 = settings.data?.item?.kibana_ca_sha256;

  const steps: EuiContainedStepProps[] = [
    DownloadStep(),
    AgentConfigSelectionStep({ agentConfigs, setSelectedAPIKeyId }),
    {
      title: i18n.translate('xpack.ingestManager.agentEnrollment.stepEnrollAndRunAgentTitle', {
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
          id="xpack.ingestManager.agentEnrollment.managedDescription"
          defaultMessage="Whether you need one agent or thousands, Fleet makes it easy to centrally manage and deploy updates to your agents. Follow the instructions below to download and enroll an Elastic Agent with Fleet."
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
            id="xpack.ingestManager.agentEnrollment.fleetNotInitializedText"
            defaultMessage="Fleet needs to be set up before agents can be enrolled. {link}"
            values={{
              link: (
                <EuiLink href={getHref('fleet')}>
                  <FormattedMessage
                    id="xpack.ingestManager.agentEnrollment.goToFleetButton"
                    defaultMessage="Go to Fleet."
                  />
                </EuiLink>
              ),
            }}
          />
        </>
      )}
    </>
  );
};
