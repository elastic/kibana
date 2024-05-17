/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPageSection } from '@elastic/eui';
import React, { useEffect } from 'react';

import { AddLicense } from './add_license';
import { LicensePageHeader } from './license_page_header';
import { RequestTrialExtension } from './request_trial_extension';
import { RevertToBasic } from './revert_to_basic';
import { StartTrial } from './start_trial';

export const LicenseDashboard = ({ setBreadcrumb, telemetry } = { setBreadcrumb: () => {} }) => {
  useEffect(() => {
    setBreadcrumb('dashboard');
  });

  return (
    <>
      <LicensePageHeader />

      <EuiPageSection>
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem>
            <AddLicense />
          </EuiFlexItem>
          <StartTrial telemetry={telemetry} />
          <RequestTrialExtension />
          <RevertToBasic />
        </EuiFlexGroup>
      </EuiPageSection>
    </>
  );
};
