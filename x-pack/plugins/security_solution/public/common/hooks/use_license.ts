/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LicenseService } from '../../../common/license/license';

export const licenseService = new LicenseService();

export function useLicense() {
  return licenseService;
}
