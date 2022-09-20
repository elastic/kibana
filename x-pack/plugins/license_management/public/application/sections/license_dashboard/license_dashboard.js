/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiPageContentBody_Deprecated as EuiPageContentBody,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { StartTrial } from './start_trial';
import { LicensePageHeader } from './license_page_header';
import { AddLicense } from './add_license';
import { RevertToBasic } from './revert_to_basic';
import { RequestTrialExtension } from './request_trial_extension';

export const LicenseDashboard = ({ setBreadcrumb, telemetry } = { setBreadcrumb: () => {} }) => {
  useEffect(() => {
    setBreadcrumb('dashboard');
  });

  return (
    <>
      <LicensePageHeader />

      <EuiPageContentBody>
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem>
            <AddLicense />
          </EuiFlexItem>
          <StartTrial telemetry={telemetry} />
          <RequestTrialExtension />
          <RevertToBasic />
        </EuiFlexGroup>
      </EuiPageContentBody>
    </>
  );
};
