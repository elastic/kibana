/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutFooter,
  EuiSteps,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentConfig } from '../../../../types';
import { EnrollmentStepAgentConfig } from './config_selection';
import {
  useGetOneEnrollmentAPIKey,
  useCore,
  useGetSettings,
  useLink,
  useFleetStatus,
} from '../../../../hooks';
import { ManualInstructions } from '../../../../components/enrollment_instructions';

interface Props {
  onClose: () => void;
  agentConfigs: AgentConfig[];
}

export const AgentEnrollmentFlyout: React.FunctionComponent<Props> = ({
  onClose,
  agentConfigs = [],
}) => {
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
    {
      title: i18n.translate('xpack.ingestManager.agentEnrollment.stepDownloadAgentTitle', {
        defaultMessage: 'Download the Elastic Agent',
      }),
      children: (
        <EuiText>
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.downloadDescription"
            defaultMessage="Download the Elastic agent on your host’s machine. You can download the agent binary and it’s verification signature from Elastic’s {downloadLink}."
            values={{
              downloadLink: (
                <EuiLink href="https://ela.st/download-elastic-agent" target="_blank">
                  <FormattedMessage
                    id="xpack.ingestManager.agentEnrollment.downloadLink"
                    defaultMessage="download page"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      ),
    },
    {
      title: i18n.translate('xpack.ingestManager.agentEnrollment.stepChooseAgentConfigTitle', {
        defaultMessage: 'Choose an agent configuration',
      }),
      children: (
        <EnrollmentStepAgentConfig agentConfigs={agentConfigs} onKeyChange={setSelectedAPIKeyId} />
      ),
    },
    {
      title: i18n.translate('xpack.ingestManager.agentEnrollment.stepRunAgentTitle', {
        defaultMessage: 'Enroll and run the Elastic Agent',
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
    <EuiFlyout onClose={onClose} size="l" maxWidth={860}>
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetAgentEnrollmentFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="FleetAgentEnrollmentFlyoutTitle">
            <FormattedMessage
              id="xpack.ingestManager.agentEnrollment.flyoutTitle"
              defaultMessage="Enroll new agent"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
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
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ingestManager.agentEnrollment.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={onClose}>
              <FormattedMessage
                id="xpack.ingestManager.agentEnrollment.continueButtonLabel"
                defaultMessage="Continue"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
