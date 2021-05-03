/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  EuiSteps,
  EuiText,
  EuiSpacer,
  EuiButton,
  EuiCode,
  EuiFlexItem,
  EuiFlexGroup,
  EuiCodeBlock,
  EuiCopy,
  EuiLink,
} from '@elastic/eui';
import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import type { AgentPolicy } from '../../../../types';
import { useStartServices, useLink, sendGetOneAgentPolicyFull } from '../../../../hooks';
import { fullAgentPolicyToYaml, agentPolicyRouteService } from '../../../../services';

import { DownloadStep, AgentPolicySelectionStep } from './steps';

interface Props {
  agentPolicies?: AgentPolicy[];
}

const RUN_INSTRUCTIONS = './elastic-agent install';

export const StandaloneInstructions = React.memo<Props>(({ agentPolicies }) => {
  const { getHref } = useLink();
  const core = useStartServices();
  const { notifications } = core;

  const [selectedPolicyId, setSelectedPolicyId] = useState<string | undefined>();
  const [fullAgentPolicy, setFullAgentPolicy] = useState<any | undefined>();

  const downloadLink = selectedPolicyId
    ? core.http.basePath.prepend(
        `${agentPolicyRouteService.getInfoFullDownloadPath(selectedPolicyId)}?standalone=true`
      )
    : undefined;

  useEffect(() => {
    async function fetchFullPolicy() {
      try {
        if (!selectedPolicyId) {
          return;
        }
        const res = await sendGetOneAgentPolicyFull(selectedPolicyId, { standalone: true });
        if (res.error) {
          throw res.error;
        }

        if (!res.data) {
          throw new Error('No data while fetching full agent policy');
        }

        setFullAgentPolicy(res.data.item);
      } catch (error) {
        notifications.toasts.addError(error, {
          title: 'Error',
        });
      }
    }
    fetchFullPolicy();
  }, [selectedPolicyId, notifications.toasts]);

  const yaml = useMemo(() => fullAgentPolicyToYaml(fullAgentPolicy), [fullAgentPolicy]);
  const steps: EuiContainedStepProps[] = [
    DownloadStep(),
    AgentPolicySelectionStep({ agentPolicies, setSelectedPolicyId, excludeFleetServer: true }),
    {
      title: i18n.translate('xpack.fleet.agentEnrollment.stepConfigureAgentTitle', {
        defaultMessage: 'Configure the agent',
      }),
      children: (
        <>
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.stepConfigureAgentDescription"
              defaultMessage="Copy this policy to the {fileName} on the host where the Elastic Agent is installed. Modify {ESUsernameVariable} and {ESPasswordVariable} in the {outputSection} section of {fileName} to use your Elasticsearch credentials."
              values={{
                fileName: <EuiCode>elastic-agent.yml</EuiCode>,
                ESUsernameVariable: <EuiCode>ES_USERNAME</EuiCode>,
                ESPasswordVariable: <EuiCode>ES_PASSWORD</EuiCode>,
                outputSection: <EuiCode>outputs</EuiCode>,
              }}
            />
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={yaml}>
                  {(copy) => (
                    <EuiButton onClick={copy} iconType="copyClipboard">
                      <FormattedMessage
                        id="xpack.fleet.agentEnrollment.copyPolicyButton"
                        defaultMessage="Copy to clipboard"
                      />
                    </EuiButton>
                  )}
                </EuiCopy>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton iconType="download" href={downloadLink} isDisabled={!downloadLink}>
                  <FormattedMessage
                    id="xpack.fleet.agentEnrollment.downloadPolicyButton"
                    defaultMessage="Download policy"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiCodeBlock language="yaml" style={{ maxHeight: 300 }} fontSize="m">
              {yaml}
            </EuiCodeBlock>
          </EuiText>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.fleet.agentEnrollment.stepRunAgentTitle', {
        defaultMessage: 'Start the agent',
      }),
      children: (
        <>
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.stepRunAgentDescription"
              defaultMessage="From the agent directory, run this command to install, enroll and start an Elastic Agent. You can reuse this command to set up agents on more than one host. Requires administrator privileges."
            />
            <EuiSpacer size="m" />
            <EuiCodeBlock fontSize="m">{RUN_INSTRUCTIONS}</EuiCodeBlock>
            <EuiSpacer size="m" />
            <EuiCopy textToCopy={RUN_INSTRUCTIONS}>
              {(copy) => (
                <EuiButton onClick={copy} iconType="copyClipboard">
                  <FormattedMessage
                    id="xpack.fleet.agentEnrollment.copyRunInstructionsButton"
                    defaultMessage="Copy to clipboard"
                  />
                </EuiButton>
              )}
            </EuiCopy>
          </EuiText>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.fleet.agentEnrollment.stepCheckForDataTitle', {
        defaultMessage: 'Check for data',
      }),
      children: (
        <>
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.stepCheckForDataDescription"
              defaultMessage="The agent should begin sending data. Go to {link} to view your data."
              values={{
                link: (
                  <EuiLink href={getHref('data_streams')}>
                    <FormattedMessage
                      id="xpack.fleet.agentEnrollment.goToDataStreamsLink"
                      defaultMessage="data streams"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </>
      ),
    },
  ];

  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.standaloneDescription"
          defaultMessage="Run an Elastic Agent standalone to configure and update the agent manually on the host where the agent is installed."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <EuiSteps steps={steps} />
    </>
  );
});
