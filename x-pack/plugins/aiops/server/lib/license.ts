/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense, LicenseType } from '@kbn/licensing-plugin/common/types';

export function isActiveLicense(licenseType: LicenseType, license?: ILicense): boolean {
  return (license && license.isActive && license.hasAtLeast(licenseType)) || false;
}
