/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlLicense } from '../../../common/license';
import { InsufficientFullLicenseError, InsufficientBasicLicenseError } from './errors';

export type LicenseCheck = () => void;

export function licenseChecks(mlLicense: MlLicense): {
  isFullLicense: LicenseCheck;
  isMinimumLicense: LicenseCheck;
} {
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
