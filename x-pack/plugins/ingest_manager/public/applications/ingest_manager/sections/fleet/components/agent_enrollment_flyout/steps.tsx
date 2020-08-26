/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EnrollmentStepAgentPolicy } from './agent_policy_selection';
import { AgentPolicy } from '../../../../types';

export const DownloadStep = () => {
  return {
    title: i18n.translate('xpack.ingestManager.agentEnrollment.stepDownloadAgentTitle', {
      defaultMessage: 'Download the Elastic Agent to your host',
    }),
    children: (
      <>
        <EuiText>
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.downloadDescription"
            defaultMessage="You can download the agent binaries and their verification signatures from the Elastic Agent download page."
          />
        </EuiText>
        <EuiSpacer size="l" />
        <EuiButton
          href="https://ela.st/download-elastic-agent"
          target="_blank"
          iconSide="right"
          iconType="popout"
        >
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.downloadLink"
            defaultMessage="Go to download page"
          />
        </EuiButton>
      </>
    ),
  };
};

export const AgentPolicySelectionStep = ({
  agentPolicies,
  setSelectedAPIKeyId,
  setSelectedPolicyId,
}: {
  agentPolicies?: AgentPolicy[];
  setSelectedAPIKeyId?: (key: string) => void;
  setSelectedPolicyId?: (policyId: string) => void;
}) => {
  return {
    title: i18n.translate('xpack.ingestManager.agentEnrollment.stepChooseAgentPolicyTitle', {
      defaultMessage: 'Choose an agent policy',
    }),
    children: (
      <EnrollmentStepAgentPolicy
        agentPolicies={agentPolicies}
        withKeySelection={setSelectedAPIKeyId ? true : false}
        onKeyChange={setSelectedAPIKeyId}
        onAgentPolicyChange={setSelectedPolicyId}
      />
    ),
  };
};
