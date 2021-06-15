/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n/react';

import { isExpired, getExpirationDateFormatted } from '../../../store/reducers/license_management';

export const LicenseExpiration = () => {
  const isLicenseExpired = useSelector(isExpired);
  const licenseExpirationDate = useSelector(getExpirationDateFormatted);

  if (isLicenseExpired) {
    return (
      <FormattedMessage
        id="xpack.licenseMgmt.licenseDashboard.licenseStatus.expiredLicenseStatusDescription"
        defaultMessage="Your license expired on {licenseExpirationDate}"
        values={{
          licenseExpirationDate: <strong>{licenseExpirationDate}</strong>,
        }}
      />
    );
  } else if (licenseExpirationDate) {
    return (
      <FormattedMessage
        id="xpack.licenseMgmt.licenseDashboard.licenseStatus.activeLicenseStatusDescription"
        defaultMessage="Your license will expire on {licenseExpirationDate}"
        values={{
          licenseExpirationDate: <strong>{licenseExpirationDate}</strong>,
        }}
      />
    );
  }

  return (
    <FormattedMessage
      id="xpack.licenseMgmt.licenseDashboard.licenseStatus.permanentActiveLicenseStatusDescription"
      defaultMessage="Your license will never expire."
    />
  );
};
