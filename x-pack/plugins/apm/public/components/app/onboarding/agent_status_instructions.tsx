/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiCallOut,
  EuiMarkdownFormat,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { EuiStepStatus } from '@elastic/eui/src/components/steps/step_number';

function AgentStatusWarningCallout() {
  return (
    <EuiCallOut color="warning">
      {i18n.translate(
        'xpack.apm.onboarding.agentStatus.warning.calloutMessage',
        {
          defaultMessage: 'No data has been received from agents yet',
        }
      )}
    </EuiCallOut>
  );
}

function AgentStatusSuccessCallout() {
  return (
    <EuiCallOut color="success">
      {i18n.translate(
        'xpack.apm.onboarding.agentStatus.success.calloutMessage',
        {
          defaultMessage: 'Data successfully received from one or more agents',
        }
      )}
    </EuiCallOut>
  );
}

export function agentStatusCheckInstruction({
  checkAgentStatus,
  agentStatus,
  agentStatusLoading,
}: {
  checkAgentStatus: () => void;
  agentStatus?: boolean;
  agentStatusLoading: boolean;
}) {
  let status: EuiStepStatus = 'incomplete';
  let statusCallout = <></>;
  if (agentStatus === false) {
    status = 'warning';
    statusCallout = <AgentStatusWarningCallout />;
  }
  if (agentStatus) {
    status = 'complete';
    statusCallout = <AgentStatusSuccessCallout />;
  }
  return {
    title: i18n.translate('xpack.apm.onboarding.agentStatusCheck.title', {
      defaultMessage: 'Agent status',
    }),
    children: (
      <>
        <EuiMarkdownFormat>
          {i18n.translate('xpack.apm.onboarding.agentStatusCheck.textPre', {
            defaultMessage:
              'Make sure your application is running and the agents are sending data.',
          })}
        </EuiMarkdownFormat>
        <EuiSpacer />
        <EuiButton
          data-test-subj="checkAgentStatus"
          onClick={checkAgentStatus}
          isLoading={agentStatusLoading}
        >
          {i18n.translate('xpack.apm.onboarding.agentStatus.check', {
            defaultMessage: 'Check Agent Status',
          })}
        </EuiButton>
        <EuiSpacer />
        {statusCallout}
      </>
    ),
    status,
  };
}
