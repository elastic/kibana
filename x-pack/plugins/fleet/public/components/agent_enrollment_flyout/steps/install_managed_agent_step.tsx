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

import { ManualInstructions } from '../../enrollment_instructions';

export const InstallManagedAgentStep = ({
  selectedApiKeyId,
  apiKeyData,
  fleetServerHosts,
  isK8s,
}: {
  fleetServerHosts: string[];
  selectedApiKeyId?: string;
  apiKeyData?: GetOneEnrollmentAPIKeyResponse | null;
  isK8s?: string;
}): EuiContainedStepProps => {
  return {
    status: selectedApiKeyId ? undefined : 'disabled',
    title: i18n.translate('xpack.fleet.agentEnrollment.stepEnrollAndRunAgentTitle', {
      defaultMessage: 'Install Elastic Agent on your host',
    }),
    children: selectedApiKeyId && apiKeyData && (
      <ManualInstructions
        apiKey={apiKeyData.item}
        fleetServerHosts={fleetServerHosts}
        isK8s={isK8s}
      />
    ),
  };
};
