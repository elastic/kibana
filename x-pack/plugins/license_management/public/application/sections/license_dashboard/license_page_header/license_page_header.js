/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageHeader, EuiSpacer } from '@elastic/eui';

import { getLicenseState } from '../../../store/reducers/license_management';

export const ActiveLicensePageHeader = ({ license, ...props }) => {
  return (
    <EuiPageHeader
      {...props}
      pageTitle={
        <span data-test-subj="licenseText">
          <FormattedMessage
            id="xpack.licenseMgmt.licenseDashboard.licenseStatus.activeLicenseStatusTitle"
            defaultMessage="Your {licenseType} license is {status}"
            values={{
              licenseType: license.type,
              status: license.status,
            }}
          />
        </span>
      }
      description={
        <span data-test-subj="licenseSubText">
          {license.expirationDate ? (
            <FormattedMessage
              id="xpack.licenseMgmt.licenseDashboard.licenseStatus.activeLicenseStatusDescription"
              defaultMessage="Your license will expire on {licenseExpirationDate}"
              values={{
                licenseExpirationDate: <strong>{license.expirationDate}</strong>,
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.licenseMgmt.licenseDashboard.licenseStatus.permanentActiveLicenseStatusDescription"
              defaultMessage="Your license will never expire."
            />
          )}
        </span>
      }
    />
  );
};

export const ExpiredLicensePageHeader = ({ license, ...props }) => {
  return (
    <EuiPageHeader
      {...props}
      pageTitle={
        <span data-test-subj="licenseText">
          <FormattedMessage
            id="xpack.licenseMgmt.licenseDashboard.licenseStatus.expiredLicenseStatusTitle"
            defaultMessage="Your {licenseType} license has expired"
            values={{
              licenseType: license.type,
            }}
          />
        </span>
      }
      description={
        <span data-test-subj="licenseSubText">
          <FormattedMessage
            id="xpack.licenseMgmt.licenseDashboard.licenseStatus.expiredLicenseStatusDescription"
            defaultMessage="Your license expired on {licenseExpirationDate}"
            values={{
              licenseExpirationDate: <strong>{license.expirationDate}</strong>,
            }}
          />
        </span>
      }
    />
  );
};

export const LicensePageHeader = () => {
  const license = useSelector(getLicenseState);

  return (
    <>
      {license.isExpired ? (
        <ExpiredLicensePageHeader
          license={license}
          bottomBorder
          iconType="alert"
          iconProps={{ color: 'danger' }}
        />
      ) : (
        <ActiveLicensePageHeader
          license={license}
          bottomBorder
          iconType="checkInCircleFilled"
          iconProps={{ color: 'success' }}
        />
      )}
      <EuiSpacer size="l" />
    </>
  );
};
