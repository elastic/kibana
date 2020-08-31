/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hasPlatinumLicense } from './license_checks';

describe('hasPlatinumLicense', () => {
  it('is true for platinum licenses', () => {
    expect(hasPlatinumLicense({ isActive: true, type: 'platinum' } as any)).toEqual(true);
  });

  it('is true for enterprise licenses', () => {
    expect(hasPlatinumLicense({ isActive: true, type: 'enterprise' } as any)).toEqual(true);
  });

  it('is true for trial licenses', () => {
    expect(hasPlatinumLicense({ isActive: true, type: 'platinum' } as any)).toEqual(true);
  });

  it('is false if the current license is expired', () => {
    expect(hasPlatinumLicense({ isActive: false, type: 'platinum' } as any)).toEqual(false);
    expect(hasPlatinumLicense({ isActive: false, type: 'enterprise' } as any)).toEqual(false);
    expect(hasPlatinumLicense({ isActive: false, type: 'trial' } as any)).toEqual(false);
  });

  it('is false for licenses below platinum', () => {
    expect(hasPlatinumLicense({ isActive: true, type: 'basic' } as any)).toEqual(false);
    expect(hasPlatinumLicense({ isActive: false, type: 'standard' } as any)).toEqual(false);
    expect(hasPlatinumLicense({ isActive: true, type: 'gold' } as any)).toEqual(false);
  });
});
