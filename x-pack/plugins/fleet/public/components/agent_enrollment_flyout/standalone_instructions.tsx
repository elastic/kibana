/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
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
import { FormattedMessage } from '@kbn/i18n-react';
import { safeDump } from 'js-yaml';

import {
  useStartServices,
  useLink,
  sendGetOneAgentPolicyFull,
  sendGetOneAgentPolicy,
  useKibanaVersion,
} from '../../hooks';
import { fullAgentPolicyToYaml, agentPolicyRouteService } from '../../services';
import { PlatformSelector } from '../../components';

import type { PackagePolicy } from '../../../common';

import { FLEET_KUBERNETES_PACKAGE } from '../../../common';

import { DownloadStep, AgentPolicySelectionStep } from './steps';
import type { InstructionProps } from './types';

export const StandaloneInstructions = React.memo<InstructionProps>(
  ({ agentPolicy, agentPolicies, refreshAgentPolicies }) => {
    const { getHref } = useLink();
    const core = useStartServices();
    const { notifications } = core;

    const [selectedPolicyId, setSelectedPolicyId] = useState<string | undefined>(agentPolicy?.id);
    const [fullAgentPolicy, setFullAgentPolicy] = useState<any | undefined>();
    const [isK8s, setIsK8s] = useState<'IS_LOADING' | 'IS_KUBERNETES' | 'IS_NOT_KUBERNETES'>(
      'IS_LOADING'
    );
    const [yaml, setYaml] = useState<string | string>('');
    const kibanaVersion = useKibanaVersion();

    const KUBERNETES_RUN_INSTRUCTIONS = 'kubectl apply -f elastic-agent-standalone-kubernetes.yaml';

    const STANDALONE_RUN_INSTRUCTIONS_LINUX = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-linux-x86_64.tar.gz
tar xzvf elastic-agent-${kibanaVersion}-linux-x86_64.tar.gz
sudo ./elastic-agent install`;

    const STANDALONE_RUN_INSTRUCTIONS_MAC = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz
tar xzvf elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz
sudo ./elastic-agent install`;

    const STANDALONE_RUN_INSTRUCTIONS_WINDOWS = `wget https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-windows-x86_64.zip -OutFile elastic-agent-${kibanaVersion}-windows-x86_64.zip
Expand-Archive .\elastic-agent-${kibanaVersion}-windows-x86_64.zip
.\\elastic-agent.exe install`;

    const linuxDebCommand = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-amd64.deb
sudo dpkg -i elastic-agent-${kibanaVersion}-amd64.deb \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

    const linuxRpmCommand = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-x86_64.rpm
sudo rpm -vi elastic-agent-${kibanaVersion}-x86_64.rpm \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

    const linuxCommand =
      isK8s === 'IS_KUBERNETES' ? KUBERNETES_RUN_INSTRUCTIONS : STANDALONE_RUN_INSTRUCTIONS_LINUX;
    const macCommand =
      isK8s === 'IS_KUBERNETES' ? KUBERNETES_RUN_INSTRUCTIONS : STANDALONE_RUN_INSTRUCTIONS_MAC;
    const windowsCommand =
      isK8s === 'IS_KUBERNETES' ? KUBERNETES_RUN_INSTRUCTIONS : STANDALONE_RUN_INSTRUCTIONS_WINDOWS;

    useEffect(() => {
      async function checkifK8s() {
        if (!selectedPolicyId) {
          return;
        }
        const agentPolicyRequest = await sendGetOneAgentPolicy(selectedPolicyId);
        const agentPol = agentPolicyRequest.data ? agentPolicyRequest.data.item : null;

        if (!agentPol) {
          setIsK8s('IS_NOT_KUBERNETES');
          return;
        }
        const k8s = (pkg: PackagePolicy) => pkg.package?.name === FLEET_KUBERNETES_PACKAGE;
        setIsK8s(
          (agentPol.package_policies as PackagePolicy[]).some(k8s)
            ? 'IS_KUBERNETES'
            : 'IS_NOT_KUBERNETES'
        );
      }
      checkifK8s();
    }, [selectedPolicyId, notifications.toasts]);

    useEffect(() => {
      async function fetchFullPolicy() {
        try {
          if (!selectedPolicyId) {
            return;
          }
          let query = { standalone: true, kubernetes: false };
          if (isK8s === 'IS_KUBERNETES') {
            query = { standalone: true, kubernetes: true };
          }
          const res = await sendGetOneAgentPolicyFull(selectedPolicyId, query);
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
      if (isK8s !== 'IS_LOADING') {
        fetchFullPolicy();
      }
    }, [selectedPolicyId, notifications.toasts, isK8s, core.http.basePath]);

    useEffect(() => {
      if (isK8s === 'IS_KUBERNETES') {
        if (typeof fullAgentPolicy === 'object') {
          return;
        }
        setYaml(fullAgentPolicy);
      } else {
        if (typeof fullAgentPolicy === 'string') {
          return;
        }
        setYaml(fullAgentPolicyToYaml(fullAgentPolicy, safeDump));
      }
    }, [fullAgentPolicy, isK8s]);

    const policyMsg =
      isK8s === 'IS_KUBERNETES' ? (
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.stepConfigureAgentDescriptionk8s"
          defaultMessage="Copy or download the Kubernetes manifest inside the Kubernetes cluster. Modify {ESUsernameVariable} and {ESPasswordVariable} in the Daemonset environment variables and apply the manifest."
          values={{
            ESUsernameVariable: <EuiCode>ES_USERNAME</EuiCode>,
            ESPasswordVariable: <EuiCode>ES_PASSWORD</EuiCode>,
          }}
        />
      ) : (
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
      );

    let downloadLink = '';
    if (selectedPolicyId) {
      downloadLink =
        isK8s === 'IS_KUBERNETES'
          ? core.http.basePath.prepend(
              `${agentPolicyRouteService.getInfoFullDownloadPath(selectedPolicyId)}?kubernetes=true`
            )
          : core.http.basePath.prepend(
              `${agentPolicyRouteService.getInfoFullDownloadPath(selectedPolicyId)}?standalone=true`
            );
    }

    const downloadMsg =
      isK8s === 'IS_KUBERNETES' ? (
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.downloadPolicyButtonk8s"
          defaultMessage="Download Manifest"
        />
      ) : (
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.downloadPolicyButton"
          defaultMessage="Download Policy"
        />
      );

    const steps = [
      !agentPolicy
        ? AgentPolicySelectionStep({
            agentPolicies,
            setSelectedPolicyId,
            excludeFleetServer: true,
            refreshAgentPolicies,
          })
        : undefined,
      DownloadStep(false),
      {
        title: i18n.translate('xpack.fleet.agentEnrollment.stepConfigureAgentTitle', {
          defaultMessage: 'Configure the agent',
        }),
        children: (
          <>
            <EuiText>
              <>{policyMsg}</>
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
                    <>{downloadMsg}</>
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
          <PlatformSelector
            linuxCommand={linuxCommand}
            macCommand={macCommand}
            windowsCommand={windowsCommand}
            linuxDebCommand={linuxDebCommand}
            linuxRpmCommand={linuxRpmCommand}
            isK8s={isK8s === 'IS_KUBERNETES'}
          />
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
    ].filter(Boolean) as EuiContainedStepProps[];

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
  }
);
