/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LicenseCheck } from '../../../licensing/public';
import { LicenseCheckResults } from '../../common/types';

export const checkLicense = (checkResults: LicenseCheck): LicenseCheckResults => {
  switch (checkResults.state) {
    case 'valid': {
      return {
        showLinks: true,
        enableLinks: true,
        message: '',
      };
    }

    case 'invalid': {
      return {
        showLinks: false,
        enableLinks: false,
        message: 'Your license does not support Reporting. Please upgrade your license.',
      };
    }

    case 'unavailable': {
      return {
        showLinks: true,
        enableLinks: false,
        message:
          'You cannot use Reporting because license information is not available at this time.',
      };
    }

    case 'expired': {
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
