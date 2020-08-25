/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MlServerLicense } from '../../lib/license';
import { InsufficientFullLicenseError, InsufficientBasicLicenseError } from './errors';

export type LicenseCheck = () => void;

export function licenseChecks(
  mlLicense: MlServerLicense
): { isFullLicense: LicenseCheck; isMinimumLicense: LicenseCheck } {
  return {
    isFullLicense() {
      if (mlLicense.isFullLicense() === false) {
        throw new InsufficientFullLicenseError('Platinum, Enterprise or trial license needed');
      }
    },
    isMinimumLicense() {
      if (mlLicense.isMinimumLicense() === false) {
        throw new InsufficientBasicLicenseError('Basic license needed');
      }
    },
  };
}
