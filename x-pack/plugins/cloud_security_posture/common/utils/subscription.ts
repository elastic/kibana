/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense, LicenseType } from '@kbn/licensing-plugin/common/types';
import { PLUGIN_NAME } from '..';

const MINIMUM_NON_CLOUD_LICENSE_TYPE: LicenseType = 'enterprise';

export const isSubscriptionAllowed = (isCloudEnabled?: boolean, license?: ILicense): boolean => {
  if (isCloudEnabled) {
    return true;
  }

  if (!license) {
    return false;
  }

  const licenseCheck = license.check(PLUGIN_NAME, MINIMUM_NON_CLOUD_LICENSE_TYPE);
  return licenseCheck.state === 'valid';
};
