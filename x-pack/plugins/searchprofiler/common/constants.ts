/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LicenseType } from '../../licensing/common/types';

const basicLicense: LicenseType = 'basic';

/** @internal */
export const PLUGIN = Object.freeze({
  id: 'searchprofiler',
  minimumLicenseType: basicLicense,
});
