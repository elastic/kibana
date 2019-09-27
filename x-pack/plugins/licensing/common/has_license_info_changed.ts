/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { License } from './license';
import { RawLicense } from './types';

export function hasLicenseInfoChanged(
  currentLicense: License | undefined,
  newLicense: RawLicense | undefined
) {
  if (currentLicense && newLicense) {
    return (
      newLicense.type !== currentLicense.type ||
      newLicense.status !== currentLicense.status ||
      newLicense.expiry_date_in_millis !== currentLicense.expiryDateInMillis
    );
  }

  return (currentLicense && !newLicense) || (newLicense && !currentLicense);
}
