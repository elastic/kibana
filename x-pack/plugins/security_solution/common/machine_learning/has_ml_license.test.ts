/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { emptyMlCapabilities } from './empty_ml_capabilities';
import { hasMlLicense } from './has_ml_license';

describe('hasMlLicense', () => {
  test('it returns false when license is not platinum or trial', () => {
    const capabilities = { ...emptyMlCapabilities, isPlatinumOrTrialLicense: false };
    expect(hasMlLicense(capabilities)).toEqual(false);
  });

  test('it returns true when license is platinum or trial', () => {
    const capabilities = { ...emptyMlCapabilities, isPlatinumOrTrialLicense: true };
    expect(hasMlLicense(capabilities)).toEqual(true);
  });
});
