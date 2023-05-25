/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { GetOneEnrollmentAPIKeyResponse } from '../../../../common/types/rest_spec/enrollment_api_key';

import { CloudFormationInstructions } from '../cloud_formation_instructions';

export const InstallCloudFormationManagedAgentStep = ({
  selectedApiKeyId,
  apiKeyData,
  enrollToken,
  isComplete,
  cloudFormationTemplateUrl,
}: {
  selectedApiKeyId?: string;
  apiKeyData?: GetOneEnrollmentAPIKeyResponse | null;
  enrollToken?: string;
  isComplete?: boolean;
  cloudFormationTemplateUrl: string;
}): EuiContainedStepProps => {
  const nonCompleteStatus = selectedApiKeyId ? undefined : 'disabled';
  const status = isComplete ? 'complete' : nonCompleteStatus;
  return {
    status,
    title: i18n.translate('xpack.fleet.agentEnrollment.cloudFormation.stepEnrollAndRunAgentTitle', {
      defaultMessage: 'Install Elastic Agent on your cloud',
    }),
    children:
      selectedApiKeyId && apiKeyData ? (
        <CloudFormationInstructions
          cloudFormationTemplateUrl={cloudFormationTemplateUrl}
          enrollmentAPIKey={enrollToken}
        />
      ) : (
        <React.Fragment />
      ),
  };
};
