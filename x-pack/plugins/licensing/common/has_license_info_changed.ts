/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { License } from '../common/license';

export function hasLicenseInfoChanged(currentLicense: License, newLicense: any) {
  if ((currentLicense && !newLicense) || (newLicense && !currentLicense)) {
    return true;
  }

  return (
    newLicense.type !== currentLicense.type ||
    newLicense.status !== currentLicense.status ||
    newLicense.expiry_date_in_millis !== currentLicense.expiryDateInMillis
  );
}
