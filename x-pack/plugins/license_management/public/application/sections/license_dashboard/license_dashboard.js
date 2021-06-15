/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageContentBody, EuiPageHeader, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { StartTrial } from './start_trial';
import { AddLicense } from './add_license';
import { LicenseStatus } from './license_status';
import { RevertToBasic } from './revert_to_basic';
import { RequestTrialExtension } from './request_trial_extension';


export const LicenseDashboard = ({ setBreadcrumb, telemetry } = { setBreadcrumb: () => {} }) => {
  useEffect(() => {
    setBreadcrumb('dashboard');
  });

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <FormattedMessage
            id="xpack.licenseManagement.dashboard.pageTitle"
            defaultMessage="License Management"
          />
        }
      />

      <EuiSpacer size="l" />

      <EuiPageContentBody>
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
      </EuiPageContentBody>
    </>
  );
};
