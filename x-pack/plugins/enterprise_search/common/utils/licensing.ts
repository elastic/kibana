/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-plugin/public';

/* hasEnterpriseLicense return if the given license is an active `enterprise` or `trial` license
 */
export function hasEnterpriseLicense(license: ILicense | null | undefined): boolean {
  if (license === undefined || license === null) return false;
  const qualifyingLicenses = ['enterprise', 'trial'];
  return license.isActive && qualifyingLicenses.includes(license?.type ?? '');
}
