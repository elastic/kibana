/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicense } from './types';

/**
 * Check if 2 potential license instances have changes between them
 * @internal
 */
export function hasLicenseInfoChanged(currentLicense: ILicense | undefined, newLicense: ILicense) {
  if (currentLicense === newLicense) return false;
  if (!currentLicense) return true;

  return (
    newLicense.error !== currentLicense.error ||
    newLicense.type !== currentLicense.type ||
    newLicense.status !== currentLicense.status ||
    newLicense.expiryDateInMillis !== currentLicense.expiryDateInMillis ||
    newLicense.isAvailable !== currentLicense.isAvailable
  );
}
