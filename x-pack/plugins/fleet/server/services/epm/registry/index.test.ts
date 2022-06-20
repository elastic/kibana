/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitPkgKey } from '.';

describe('splitPkgKey', () => {
  it('throws an error if there is nothing before the delimiter', () => {
    expect(() => {
      splitPkgKey('-0.0.1-dev1');
    }).toThrow();
  });

  it('throws an error if the version is not a semver', () => {
    expect(() => {
      splitPkgKey('awesome-laskdfj');
    }).toThrow();
  });

  it('returns name and empty version if no delimiter is found', () => {
    const { pkgName, pkgVersion } = splitPkgKey('awesome_package');
    expect(pkgName).toBe('awesome_package');
    expect(pkgVersion).toBe('');
  });

  it('returns the name and version if the delimiter is found once', () => {
    const { pkgName, pkgVersion } = splitPkgKey('awesome-0.1.0');
    expect(pkgName).toBe('awesome');
    expect(pkgVersion).toBe('0.1.0');
  });

  it('returns the name and version if the delimiter is found multiple times', () => {
    const { pkgName, pkgVersion } = splitPkgKey('endpoint-0.13.0-alpha.1+abcd');
    expect(pkgName).toBe('endpoint');
    expect(pkgVersion).toBe('0.13.0-alpha.1+abcd');
  });
});
