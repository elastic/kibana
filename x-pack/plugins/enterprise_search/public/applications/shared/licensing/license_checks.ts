/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILicense } from '../../../../../licensing/public';

export const hasPlatinumLicense = (license?: ILicense) => {
  const qualifyingLicenses = ['platinum', 'enterprise', 'trial'];
  return license?.isActive && qualifyingLicenses.includes(license?.type as string);
};

export const hasGoldLicense = (license?: ILicense) => {
  const qualifyingLicenses = ['gold', 'platinum', 'enterprise', 'trial'];
  return license?.isActive && qualifyingLicenses.includes(license?.type as string);
};
