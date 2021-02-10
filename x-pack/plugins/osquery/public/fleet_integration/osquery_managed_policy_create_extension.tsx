/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { PackagePolicyCreateExtensionComponentProps } from '../../../fleet/public';

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app create / edit package policy
 */
export const OsqueryManagedPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  () => (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut data-test-subj="endpointPackagePolicy_create" iconType="iInCircle">
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.osquery.fleet.createPackagePolicy.osqueryConfiguration"
              defaultMessage="We'll save your integration with our recommended defaults. You can change this later by editing the integration in Osquery app"
            />
          </p>
        </EuiText>
      </EuiCallOut>
    </>
  )
);
OsqueryManagedPolicyCreateExtension.displayName = 'OsqueryManagedPolicyCreateExtension';
