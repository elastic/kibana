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

import { GoogleCloudShellInstructions } from '../google_cloud_shell_instructions';

export const InstallGoogleCloudShellManagedAgentStep = ({
  selectedApiKeyId,
  apiKeyData,
  isComplete,
  cloudShellUrl,
  cloudShellCommand,
}: {
  selectedApiKeyId?: string;
  apiKeyData?: GetOneEnrollmentAPIKeyResponse | null;
  isComplete?: boolean;
  cloudShellUrl?: string | undefined;
  cloudShellCommand?: string;
}): EuiContainedStepProps => {
  const nonCompleteStatus = selectedApiKeyId ? undefined : 'disabled';
  const status = isComplete ? 'complete' : nonCompleteStatus;

  return {
    status,
    title: i18n.translate('xpack.fleet.agentEnrollment.cloudShell.stepEnrollAndRunAgentTitle', {
      defaultMessage: 'Install Elastic Agent on your cloud',
    }),
    children:
      selectedApiKeyId && apiKeyData && cloudShellUrl ? (
        <GoogleCloudShellInstructions
          cloudShellUrl={cloudShellUrl || ''}
          cloudShellCommand={cloudShellCommand || ''}
        />
      ) : (
        <React.Fragment />
      ),
  };
};
