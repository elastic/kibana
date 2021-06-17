/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { capitalize } from 'lodash';
import { useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageHeader, EuiSpacer } from '@elastic/eui';

import { getLicenseState } from '../../../store/reducers/license_management';

const PageTitle = ({ license }) => {
  const licenseType = capitalize(license.type);

  return (
    <>
      {license.isExpired ? (
        <FormattedMessage
          id="xpack.licenseMgmt.licenseDashboard.licenseStatus.expiredLicenseStatusTitle"
          defaultMessage="Your {licenseType} license has expired"
          values={{
            licenseType,
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.licenseMgmt.licenseDashboard.licenseStatus.activeLicenseStatusTitle"
          defaultMessage="Your {licenseType} license is {status}"
          values={{
            licenseType,
            status: license.status,
          }}
        />
      )}
    </>
  );
};

const PageDescription = ({ license }) => {
  if (license.isExpired) {
    return (
      <FormattedMessage
        id="xpack.licenseMgmt.licenseDashboard.licenseStatus.expiredLicenseStatusDescription"
        defaultMessage="Your license expired on {licenseExpirationDate}"
        values={{
          licenseExpirationDate: <strong>{license.expirationDate}</strong>,
        }}
      />
    );
  } else if (license.expirationDate) {
    return (
      <FormattedMessage
        id="xpack.licenseMgmt.licenseDashboard.licenseStatus.activeLicenseStatusDescription"
        defaultMessage="Your license will expire on {licenseExpirationDate}"
        values={{
          licenseExpirationDate: <strong>{license.expirationDate}</strong>,
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

const getPageIconConfig = ({ license }) => {
  return {
    iconType: license.isExpired ? 'alert' : 'checkInCircleFilled',
    iconProps: {
      color: license.isExpired ? 'danger' : 'success',
    },
  };
};

export const LicensePageHeader = () => {
  const license = useSelector(getLicenseState);

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={<PageTitle license={license} />}
        description={<PageDescription license={license} />}
        {...getPageIconConfig({ license })}
      />

      <EuiSpacer size="l" />
    </>
  );
};
