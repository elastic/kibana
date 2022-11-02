/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPackagePrerelease } from './package_prerelease';

describe('isPackagePrerelease', () => {
  it('should return prerelease true for 0.1.0', () => {
    expect(isPackagePrerelease('0.1.0')).toBe(true);
  });

  it('should return prerelease false for 1.1.0', () => {
    expect(isPackagePrerelease('1.1.0')).toBe(false);
  });

  it('should return prerelease true for 1.0.0-preview', () => {
    expect(isPackagePrerelease('1.0.0-preview')).toBe(true);
  });

  it('should return prerelease true for 1.0.0-beta', () => {
    expect(isPackagePrerelease('1.0.0-beta')).toBe(true);
  });

  it('should return prerelease true for 1.0.0-rc', () => {
    expect(isPackagePrerelease('1.0.0-rc')).toBe(true);
  });

  it('should return prerelease true for 1.0.0-dev.0', () => {
    expect(isPackagePrerelease('1.0.0-dev.0')).toBe(true);
  });
});
