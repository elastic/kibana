/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { LicenseStatus } from './license_status';
import { RevertToBasic } from './revert_to_basic';
import { StartTrial } from './start_trial';
import { AddLicense } from './add_license';
import { RequestTrialExtension } from './request_trial_extension';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

export const LicenseDashboard = ({ setBreadcrumb, telemetry } = { setBreadcrumb: () => {} }) => {
  useEffect(() => {
    setBreadcrumb('dashboard');
  });

  return (
    <div>
      <LicenseStatus />
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem>
          <AddLicense />
        </EuiFlexItem>
        <StartTrial telemetry={telemetry} />
        <RequestTrialExtension />
        <RevertToBasic />
      </EuiFlexGroup>
    </div>
  );
};
