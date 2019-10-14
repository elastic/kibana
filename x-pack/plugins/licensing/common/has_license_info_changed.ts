/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { License } from './license';

/**
 * @public
 * Check if 2 potential license instances have changes between them
 */
export function hasLicenseInfoChanged(
  currentLicense: License | undefined,
  newLicense: License | undefined
) {
  // If we have 2 valid license instances, let's check:
  // 1. That if they both contain an error that the message has changed
  // 2. Check if the type has changed
  // 3. Check if the status has changed
  // 4. Check if the expiration date has changed
  // 5. Check is the availability of the license has changed.
  if (currentLicense && newLicense) {
    if (
      (currentLicense.error && !newLicense.error) ||
      (!currentLicense.error && newLicense.error) ||
      (newLicense.error &&
        currentLicense.error &&
        newLicense.error.message !== currentLicense.error.message)
    ) {
      return true;
    }

    return (
      newLicense.type !== currentLicense.type ||
      newLicense.status !== currentLicense.status ||
      newLicense.expiryDateInMillis !== currentLicense.expiryDateInMillis ||
      newLicense.isAvailable !== currentLicense.isAvailable
    );
  }

  // If we have made it here, one or both of the licenses are undefined.
  // If they match (both undefined), nothing has changed, otherwise it did.
  return currentLicense !== newLicense;
}
