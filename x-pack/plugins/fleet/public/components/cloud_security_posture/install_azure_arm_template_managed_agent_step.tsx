/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { AgentPolicy } from '../../../common';

import type { GetOneEnrollmentAPIKeyResponse } from '../../../common/types';

import type { CloudSecurityIntegration } from '../agent_enrollment_flyout/types';

import { AzureArmTemplateInstructions } from './azure_arm_template_instructions';

export const InstallAzureArmTemplateManagedAgentStep = ({
  selectedApiKeyId,
  apiKeyData,
  enrollToken,
  isComplete,
  cloudSecurityIntegration,
  agentPolicy,
}: {
  selectedApiKeyId?: string;
  apiKeyData?: GetOneEnrollmentAPIKeyResponse | null;
  enrollToken?: string;
  isComplete?: boolean;
  cloudSecurityIntegration?: CloudSecurityIntegration | undefined;
  agentPolicy?: AgentPolicy;
}): EuiContainedStepProps => {
  const nonCompleteStatus = selectedApiKeyId ? undefined : 'disabled';
  const status = isComplete ? 'complete' : nonCompleteStatus;

  return {
    status,
    title: i18n.translate(
      'xpack.fleet.agentEnrollment.azureArmTemplate.stepEnrollAndRunAgentTitle',
      { defaultMessage: 'Install Elastic Agent on your cloud' }
    ),
    children:
      selectedApiKeyId && apiKeyData && cloudSecurityIntegration ? (
        <AzureArmTemplateInstructions
          cloudSecurityIntegration={cloudSecurityIntegration}
          enrollmentAPIKey={enrollToken}
          agentPolicy={agentPolicy}
        />
      ) : (
        <React.Fragment />
      ),
  };
};
