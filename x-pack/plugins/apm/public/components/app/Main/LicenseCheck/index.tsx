/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { STATUS } from '../../../../constants/index';
import { LicenceRequest } from '../../../../store/reactReduxRequest/license';
import { InvalidLicenseNotification } from './InvalidLicenseNotification';

export const LicenseCheck: React.FunctionComponent = ({ children }) => {
  return (
    <LicenceRequest
      render={({ data: licenseData, status: licenseStatus }) => {
        const hasValidLicense = licenseData.license.is_active;
        if (licenseStatus === STATUS.SUCCESS && !hasValidLicense) {
          return <InvalidLicenseNotification />;
        }

        return children;
      }}
    />
  );
};
