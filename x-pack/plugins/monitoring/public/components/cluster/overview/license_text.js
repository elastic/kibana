/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import moment from 'moment-timezone';
import { capitalize } from 'lodash';
import { EuiLink } from '@elastic/eui';

const formatDateLocal = input => moment.tz(input, moment.tz.guess()).format('LL');

const WillExpireOn = ({ expiryDate }) => {
  if (expiryDate === undefined) {
    return null;
  }

  return <Fragment> will expire on {formatDateLocal(expiryDate)}</Fragment>;
};

export function LicenseText({ license, showLicenseExpiration }) {
  if (!showLicenseExpiration) {
    return null;
  }

  return (
    <EuiLink href="#/license">
      {capitalize(license.type)} license <WillExpireOn expiryDate={license.expiry_date} />
    </EuiLink>
  );
}
