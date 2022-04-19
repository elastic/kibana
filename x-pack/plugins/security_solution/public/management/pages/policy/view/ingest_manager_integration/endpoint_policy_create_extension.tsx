/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PackagePolicyCreateExtensionComponentProps } from '@kbn/fleet-plugin/public';

/**
 * Exports Endpoint-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const EndpointPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    // Fleet will initialize the create form with a default name for the integratin policy, however,
    // for endpoint security, we want the user to explicitely type in a name, so we blank it out
    // only during 1st component render (thus why the eslint disabled rule below).
    useEffect(() => {
      onChange({
        isValid: false,
        updatedPolicy: {
          ...newPolicy,
          name: '',
        },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
  }
);
EndpointPolicyCreateExtension.displayName = 'EndpointPolicyCreateExtension';
