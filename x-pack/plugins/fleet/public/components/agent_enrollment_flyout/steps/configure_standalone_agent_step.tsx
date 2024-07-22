/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCopy,
  EuiCodeBlock,
  EuiLink,
  EuiCallOut,
  EuiFieldText,
  EuiButtonIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { K8sMode } from '../types';
import { useStartServices } from '../../../hooks';

export const ConfigureStandaloneAgentStep = ({
  isK8s,
  yaml,
  downloadYaml,
  apiKey,
  onCreateApiKey,
  isComplete,
  onCopy,
}: {
  isK8s?: K8sMode;
  selectedPolicyId?: string;
  yaml: string;
  downloadYaml: () => void;
  apiKey: string | undefined;
  onCreateApiKey: () => void;
  isComplete?: boolean;
  onCopy?: () => void;
}): EuiContainedStepProps => {
  const core = useStartServices();
  const { docLinks } = core;

  const policyMsg =
    isK8s === 'IS_KUBERNETES' ? (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.stepConfigureAgentDescriptionk8s"
        defaultMessage="Copy or download the Kubernetes manifest inside the Kubernetes cluster. Update {ESUsernameVariable} and {ESPasswordVariable} environment variables in the Daemonset to match your Elasticsearch credentials. Note that the following manifest contains resource limits that may not be appropriate for a production environment, review our guide on {scalingGuideLink} before deploying this manifest."
        values={{
          ESUsernameVariable: <EuiCode>ES_USERNAME</EuiCode>,
          ESPasswordVariable: <EuiCode>ES_PASSWORD</EuiCode>,
          scalingGuideLink: (
            <EuiLink
              external
              href={docLinks.links.fleet.scalingKubernetesResourcesAndLimits}
              target="_blank"
            >
              <FormattedMessage
                id="xpack.fleet.fleet.agentEnrollment.k8ScalingGuideLinkText"
                defaultMessage="Scaling Elastic Agent on Kubernetes"
              />
            </EuiLink>
          ),
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.stepConfigureAgentDescription"
        defaultMessage="Copy this policy to the {fileName} on the host where the Elastic Agent is installed. Either use an existing API key and modify {apiKeyVariable} in the {outputSection} section of {fileName} or click the button below to generate a new one. Refer to {guideLink} for details."
        values={{
          fileName: <EuiCode>elastic-agent.yml</EuiCode>,
          apiKeyVariable: <EuiCode>API_KEY</EuiCode>,
          outputSection: <EuiCode>outputs</EuiCode>,
          guideLink: (
            <EuiLink
              external
              href={docLinks.links.fleet.grantESAccessToStandaloneAgents}
              target="_blank"
            >
              <FormattedMessage
                id="xpack.fleet.fleet.agentEnrollment.standaloneAgentAccessLinkText"
                defaultMessage="Grant standalone Elastic Agents access to Elasticsearch"
              />
            </EuiLink>
          ),
        }}
      />
    );

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

  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepConfigureAgentTitle', {
      defaultMessage: 'Configure the agent',
    }),
    children: (
      <>
        {!yaml ? null : (
          <EuiText>
            <>{policyMsg}</>
            <EuiSpacer size="m" />
            {apiKey && (
              <EuiCallOut
                title={i18n.translate('xpack.fleet.agentEnrollment.apiKeyBanner.created', {
                  defaultMessage: 'API Key created.',
                })}
                color="success"
                iconType="check"
                data-test-subj="obltOnboardingLogsApiKeyCreated"
              >
                <p>
                  {i18n.translate('xpack.fleet.agentEnrollment.apiKeyBanner.created.description', {
                    defaultMessage:
                      'Remember to store this information in a safe place. It won’t be displayed anymore after you continue.',
                  })}
                </p>
                <EuiFieldText
                  data-test-subj="apmAgentKeyCallOutFieldText"
                  readOnly
                  value={apiKey}
                  aria-label={i18n.translate(
                    'xpack.fleet.agentEnrollment.apiKeyBanner.field.label',
                    {
                      defaultMessage: 'Api Key',
                    }
                  )}
                  append={
                    <EuiCopy textToCopy={apiKey}>
                      {(copy) => (
                        <EuiButtonIcon
                          iconType="copyClipboard"
                          onClick={copy}
                          color="success"
                          css={{
                            '> svg.euiIcon': {
                              borderRadius: '0 !important',
                            },
                          }}
                          aria-label={i18n.translate('xpack.fleet.apiKeyBanner.field.copyButton', {
                            defaultMessage: 'Copy to clipboard',
                          })}
                        />
                      )}
                    </EuiCopy>
                  }
                />
              </EuiCallOut>
            )}
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={onCreateApiKey}>
                  <FormattedMessage
                    id="xpack.fleet.agentEnrollment.createApiKeyButton"
                    defaultMessage="Create API key"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={yaml}>
                  {(copy) => (
                    <EuiButton
                      onClick={() => {
                        copy();
                        if (onCopy) onCopy();
                      }}
                      iconType="copyClipboard"
                    >
                      <FormattedMessage
                        id="xpack.fleet.agentEnrollment.copyPolicyButton"
                        defaultMessage="Copy to clipboard"
                      />
                    </EuiButton>
                  )}
                </EuiCopy>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="download"
                  onClick={() => {
                    if (onCopy) onCopy();
                    downloadYaml();
                  }}
                  isDisabled={!downloadYaml}
                >
                  <>{downloadMsg}</>
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiCodeBlock
              language="yaml"
              style={{ maxHeight: 300 }}
              fontSize="m"
              data-test-subj="agentPolicyCodeBlock"
            >
              {yaml}
            </EuiCodeBlock>
          </EuiText>
        )}
      </>
    ),
    status: !yaml ? 'loading' : isComplete ? 'complete' : undefined,
  };
};
