/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
} from '@elastic/eui';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentConfig } from '../../../../types';
import { useCore, sendGetOneAgentConfigFull } from '../../../../hooks';
import { DownloadStep, AgentConfigSelectionStep } from './steps';
import { configToYaml, agentConfigRouteService } from '../../../../services';

interface Props {
  agentConfigs?: AgentConfig[];
}

const RUN_INSTRUCTIONS = './elastic-agent run';

export const StandaloneInstructions: React.FunctionComponent<Props> = ({ agentConfigs }) => {
  const core = useCore();
  const { notifications } = core;

  const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>();
  const [fullAgentConfig, setFullAgentConfig] = useState<any | undefined>();

  const downloadLink = selectedConfigId
    ? core.http.basePath.prepend(
        `${agentConfigRouteService.getInfoFullDownloadPath(selectedConfigId)}?standalone=true`
      )
    : undefined;

  useEffect(() => {
    async function fetchFullConfig() {
      try {
        if (!selectedConfigId) {
          return;
        }
        const res = await sendGetOneAgentConfigFull(selectedConfigId, { standalone: true });
        if (res.error) {
          throw res.error;
        }

        if (!res.data) {
          throw new Error('No data while fetching full agent config');
        }

        setFullAgentConfig(res.data.item);
      } catch (error) {
        notifications.toasts.addError(error, {
          title: 'Error',
        });
      }
    }
    fetchFullConfig();
  }, [selectedConfigId, notifications.toasts]);

  const yaml = useMemo(() => configToYaml(fullAgentConfig), [fullAgentConfig]);
  const steps: EuiContainedStepProps[] = [
    DownloadStep(),
    AgentConfigSelectionStep({ agentConfigs, setSelectedConfigId }),
    {
      title: i18n.translate('xpack.ingestManager.agentEnrollment.stepConfigureAgentTitle', {
        defaultMessage: 'Configure the agent',
      }),
      children: (
        <>
          <EuiText>
            <FormattedMessage
              id="xpack.ingestManager.agentEnrollment.stepConfigureAgentDescription"
              defaultMessage="Copy this configuration and put it into a file named {fileName} on the system where the Elastic Agent is installed. Don’t forget to modify {ESUsernameVariable} and {ESPasswordVariable} in the {outputSection} section of the configuration file so that it uses your actual Elasticsearch credentials."
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
                        id="xpack.ingestManager.agentEnrollment.copyConfigurationButton"
                        defaultMessage="Copy to clipboard"
                      />
                    </EuiButton>
                  )}
                </EuiCopy>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton iconType="download" href={downloadLink} isDisabled={!downloadLink}>
                  <FormattedMessage
                    id="xpack.ingestManager.agentEnrollment.downloadConfigurationButton"
                    defaultMessage="Download configuration"
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
      title: i18n.translate('xpack.ingestManager.agentEnrollment.stepRunAgentTitle', {
        defaultMessage: 'Start the agent',
      }),
      children: (
        <>
          <EuiText>
            <FormattedMessage
              id="xpack.ingestManager.agentEnrollment.stepRunAgentDescription"
              defaultMessage="From the agent’s directory, run the following command to start the agent."
            />
            <EuiSpacer size="m" />
            <EuiCodeBlock fontSize="m">{RUN_INSTRUCTIONS}</EuiCodeBlock>
            <EuiSpacer size="m" />
            <EuiCopy textToCopy={RUN_INSTRUCTIONS}>
              {(copy) => (
                <EuiButton onClick={copy} iconType="copyClipboard">
                  <FormattedMessage
                    id="xpack.ingestManager.agentEnrollment.copyRunInstructionsButton"
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
      title: i18n.translate('xpack.ingestManager.agentEnrollment.stepCheckForDataTitle', {
        defaultMessage: 'Check for data',
      }),
      status: 'incomplete',
      children: (
        <>
          <EuiText>
            <FormattedMessage
              id="xpack.ingestManager.agentEnrollment.stepCheckForDataDescription"
              defaultMessage="After starting the agent, the agent should begin sending data. You can view this data on Ingest Manager’s datasets page."
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
          id="xpack.ingestManager.agentEnrollment.standaloneDescription"
          defaultMessage="Agents running in standalone mode need to be updated manually if you ever wish to make changes to their configuration. Follow the instructions below to download and setup an Elastic Agent in standalone mode."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <EuiSteps steps={steps} />
    </>
  );
};
