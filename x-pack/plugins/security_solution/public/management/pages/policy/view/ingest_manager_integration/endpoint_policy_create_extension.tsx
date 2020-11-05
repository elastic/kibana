/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { IntegrationPolicyCreateExtensionComponent } from '../../../../../../../ingest_manager/common/types/ui_extensions';

/**
 * Exports Endpoint-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const EndpointPolicyCreateExtension = memo<IntegrationPolicyCreateExtensionComponent>(() => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut data-test-subj="endpointPackagePolicy_create" iconType="iInCircle">
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.ingestManager.createPackagePolicy.endpointConfiguration"
              defaultMessage="We'll save your integration with our recommended defaults. You can change this later by editing the Endpoint Security integration within your agent policy."
            />
          </p>
        </EuiText>
      </EuiCallOut>
    </>
  );
});
EndpointPolicyCreateExtension.displayName = 'EndpointPolicyCreateExtension';
