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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { K8sMode } from '../types';

export const ConfigureStandaloneAgentStep = ({
  isK8s,
  selectedPolicyId,
  yaml,
  downloadLink,
}: {
  isK8s?: K8sMode;
  selectedPolicyId?: string;
  yaml: string;
  downloadLink: string;
}): EuiContainedStepProps => {
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
        )}
      </>
    ),
    status: !yaml ? 'loading' : 'incomplete',
  };
};
