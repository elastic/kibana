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
import { safeDump } from 'js-yaml';

import {
  useStartServices,
  useLink,
  sendGetOneAgentPolicyFull,
  sendGetOneAgentPolicy,
} from '../../hooks';
import { fullAgentPolicyToYaml, agentPolicyRouteService } from '../../services';

import { DownloadStep, AgentPolicySelectionStep } from './steps';
import type { BaseProps } from './types';
import {PackagePolicy} from "../../../common";

type Props = BaseProps;

export const elasticAgentPolicy = '';
export const StandaloneInstructions = React.memo<Props>(({ agentPolicy, agentPolicies }) => {
  const { getHref } = useLink();
  const core = useStartServices();
  const { notifications } = core;

  const [selectedPolicyId, setSelectedPolicyId] = useState<string | undefined>(agentPolicy?.id);
  const [fullAgentPolicy, setFullAgentPolicy] = useState<any | undefined>();
  const [isK8s, setIsK8s] = useState<string | undefined>("isLoading");
  const [yaml, setYaml] = useState<string | string>("");
  const [runInstructions, setRunInstructions] = useState<string | string>("");
  const [downloadLink, setDownloadLink] = useState<string | undefined>();
  const [policyMessage, setPolicyMessage] = useState<string | undefined>("");
  const [applyMessage, setApplyMessage] = useState<string | undefined>("");
  const [downloadMessage, setDownloadMessage] = useState<string | undefined>("");



  useEffect(() => {
    async function checkifK8s() {
      if (!selectedPolicyId) {
        return;
      }
      const agentPolicyRequest = await sendGetOneAgentPolicy(selectedPolicyId);
      const agentPolicy = agentPolicyRequest.data ? agentPolicyRequest.data.item : null;

      if (!agentPolicy) {
        setIsK8s("false");
        return;
      }
      let found = false;
      (agentPolicy.package_policies as PackagePolicy[]).forEach(({ package: pkg }) => {
        if (!pkg) {
          return;
        }
        if (pkg.name == "kubernetes") {
          found = true;
          return;
        }
      });

      if (found) {
        setIsK8s("true");
      } else {
        setIsK8s("false");
      }
    }
    checkifK8s()
  }, [selectedPolicyId, notifications.toasts]);


  useEffect(() => {
    async function fetchFullPolicy() {
      try {
        if (!selectedPolicyId) {
          return;
        }
        let query = { standalone: true, kubernetes: false };
        let downloandLinkUrl = `${agentPolicyRouteService.getInfoFullDownloadPath(selectedPolicyId)}?standalone=true`;
        if (isK8s == "true"){
          query = { standalone: true, kubernetes: true };
          downloandLinkUrl = `${agentPolicyRouteService.getInfoFullDownloadPath(selectedPolicyId)}?kubernetes=true`;
        }
        const res = await sendGetOneAgentPolicyFull(selectedPolicyId, query);
        if (res.error) {
          throw res.error;
        }

        if (!res.data) {
          throw new Error('No data while fetching full agent policy');
        }
        setFullAgentPolicy(res.data.item);
        setDownloadLink(core.http.basePath.prepend(
          downloandLinkUrl
        ));
      } catch (error) {
        notifications.toasts.addError(error, {
          title: 'Error',
        });
      }
    }
    if (isK8s != "isLoading") {
        fetchFullPolicy()
    }
  }, [selectedPolicyId, notifications.toasts, isK8s],);

  useMemo(() => setYamlInstructions(), [fullAgentPolicy]);

  function setYamlInstructions(){
    if (isK8s == "true") {
        if (typeof fullAgentPolicy === 'object') {
          return;
        }
        setYaml(fullAgentPolicy);
        setRunInstructions('kubectl apply -f elastic-agent.yml');
        setPolicyMessage("Copy or download the Kubernetes manifest inside the Kubernetes cluster. Modify {ESUsernameVariable}, {ESPasswordVariable} and {ESHostVariable} in the Daemonset environment variables and apply the manifest.");
        setApplyMessage("From the directory where the Kubernetes manifest is downloaded, run the apply command.");
        setDownloadMessage("Download Manifest");
    } else {
        if (typeof fullAgentPolicy === 'string') {
          return;
        }
        setYaml(fullAgentPolicyToYaml(fullAgentPolicy, safeDump));
        setRunInstructions('./elastic-agent install');
        setPolicyMessage("Copy this policy to the {fileName} on the host where the Elastic Agent is installed. Modify {ESUsernameVariable} and {ESPasswordVariable} in the {outputSection} section of {fileName} to use your Elasticsearch credentials.");
        setApplyMessage("From the agent directory, run this command to install, enroll and start an Elastic Agent. You can reuse this command to set up agents on more than one host. Requires administrator privileges.");
        setDownloadMessage("Download Policy");
    }
  }


  const steps = [
    DownloadStep(),
    !agentPolicy
      ? AgentPolicySelectionStep({ agentPolicies, setSelectedPolicyId, excludeFleetServer: true })
      : undefined,
    {
      title: i18n.translate('xpack.fleet.agentEnrollment.stepConfigureAgentTitle', {
        defaultMessage: 'Configure the agent',
      }),
      children: (
        <>
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentEnrollment.stepConfigureAgentDescription"
              defaultMessage={policyMessage}
              values={{
                fileName: <EuiCode>elastic-agent.yml</EuiCode>,
                ESUsernameVariable: <EuiCode>ES_USERNAME</EuiCode>,
                ESPasswordVariable: <EuiCode>ES_PASSWORD</EuiCode>,
                ESHostVariable: <EuiCode>ES_HOST</EuiCode>,
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
                    defaultMessage={downloadMessage}
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
              defaultMessage={applyMessage}
            />
            <EuiSpacer size="m" />
            <EuiCodeBlock fontSize="m">{runInstructions}</EuiCodeBlock>
            <EuiSpacer size="m" />
            <EuiCopy textToCopy={runInstructions}>
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
});
