/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { GetOneEnrollmentAPIKeyResponse } from '../../../common/types';

import type { CloudSecurityIntegration } from '../agent_enrollment_flyout/types';

import { CloudFormationInstructions } from './cloud_formation_instructions';

export const InstallCloudFormationManagedAgentStep = ({
  selectedApiKeyId,
  apiKeyData,
  enrollToken,
  isComplete,
  cloudSecurityIntegration,
  fleetServerHost,
}: {
  selectedApiKeyId?: string;
  apiKeyData?: GetOneEnrollmentAPIKeyResponse | null;
  enrollToken?: string;
  isComplete?: boolean;
  cloudSecurityIntegration?: CloudSecurityIntegration | undefined;
  fleetServerHost: string;
}): EuiContainedStepProps => {
  const nonCompleteStatus = selectedApiKeyId ? undefined : 'disabled';
  const status = isComplete ? 'complete' : nonCompleteStatus;

  return {
    status,
    title: i18n.translate('xpack.fleet.agentEnrollment.cloudFormation.stepEnrollAndRunAgentTitle', {
      defaultMessage: 'Install Elastic Agent on your cloud',
    }),
    children:
      selectedApiKeyId && apiKeyData && cloudSecurityIntegration ? (
        <CloudFormationInstructions
          cloudSecurityIntegration={cloudSecurityIntegration}
          enrollmentAPIKey={enrollToken}
          fleetServerHost={fleetServerHost}
        />
      ) : (
        <React.Fragment />
      ),
  };
};
