/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LicenseCheckResults } from '../..';
import { LICENSE_CHECK_STATE, LicenseCheck } from '../../../licensing/public';

export const checkLicense = (checkResults: LicenseCheck): LicenseCheckResults => {
  switch (checkResults.state) {
    case LICENSE_CHECK_STATE.Valid: {
      return {
        showLinks: true,
        enableLinks: true,
        message: '',
      };
    }

    case LICENSE_CHECK_STATE.Invalid: {
      return {
        showLinks: false,
        enableLinks: false,
        message: 'Your license does not support Reporting. Please upgrade your license.',
      };
    }

    case LICENSE_CHECK_STATE.Unavailable: {
      return {
        showLinks: true,
        enableLinks: false,
        message:
          'You cannot use Reporting because license information is not available at this time.',
      };
    }

    case LICENSE_CHECK_STATE.Expired: {
      return {
        showLinks: true,
        enableLinks: false,
        message: 'You cannot use Reporting because your license has expired.',
      };
    }

    default: {
      return {
        showLinks: true,
        enableLinks: true,
        message: '',
      };
    }
  }
};
