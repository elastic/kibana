/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EnrollmentStepAgentConfig } from './config_selection';
import { AgentConfig } from '../../../../types';

export const DownloadStep = () => {
  return {
    title: i18n.translate('xpack.ingestManager.agentEnrollment.stepDownloadAgentTitle', {
      defaultMessage: 'Download the Elastic Agent',
    }),
    children: (
      <>
        <EuiText>
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.downloadDescription"
            defaultMessage="Download the Elastic Agent on your host’s machine. You can access the agent binaries and their verification signatures from the Elastic Agent download page."
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
            defaultMessage="Go to elastic.co/downloads"
          />
        </EuiButton>
      </>
    ),
  };
};

export const AgentConfigSelectionStep = ({
  agentConfigs,
  setSelectedAPIKeyId,
  setSelectedConfigId,
}: {
  agentConfigs?: AgentConfig[];
  setSelectedAPIKeyId?: (key: string) => void;
  setSelectedConfigId?: (configId: string) => void;
}) => {
  return {
    title: i18n.translate('xpack.ingestManager.agentEnrollment.stepChooseAgentConfigTitle', {
      defaultMessage: 'Choose an agent configuration',
    }),
    children: (
      <EnrollmentStepAgentConfig
        agentConfigs={agentConfigs}
        withKeySelection={setSelectedAPIKeyId ? true : false}
        onKeyChange={setSelectedAPIKeyId}
        onConfigChange={setSelectedConfigId}
      />
    ),
  };
};
