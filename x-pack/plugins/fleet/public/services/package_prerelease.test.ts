/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPackagePrerelease } from './package_prerelease';

describe('isPackagePrerelease', () => {
  it('should return prerelease true for 0.1.0', () => {
    expect(isPackagePrerelease({ version: '0.1.0' } as any)).toBe(true);
  });

  it('should return prerelease false for 1.1.0', () => {
    expect(isPackagePrerelease({ version: '1.1.0' } as any)).toBe(false);
  });

  it('should return prerelease true for 1.0.0-preview', () => {
    expect(isPackagePrerelease({ version: '1.0.0-preview' } as any)).toBe(true);
  });

  it('should return prerelease true for 1.0.0-beta', () => {
    expect(isPackagePrerelease({ version: '1.0.0-beta' } as any)).toBe(true);
  });

  it('should return prerelease true for 1.0.0-rc', () => {
    expect(isPackagePrerelease({ version: '1.0.0-rc' } as any)).toBe(true);
  });
});
