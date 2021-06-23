/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isVersionSupported, isOsSupported, isIsolationSupported } from './utils';

describe('Host Isolation utils isVersionSupported', () => {
  it('should validate that a higher major version is compatible with a lower major version', () => {
    expect(
      isVersionSupported({
        currentVersion: '8.14.0',
        minVersionRequired: '7.13.0',
      })
    ).toEqual(true);
  });

  it('should validate that a higher minor version is compatible with a lower minor version', () => {
    expect(
      isVersionSupported({
        currentVersion: '7.14.0',
        minVersionRequired: '7.13.0',
      })
    ).toEqual(true);
  });

  it('should validate that a higher patch version is compatible with a lower patch version', () => {
    expect(
      isVersionSupported({
        currentVersion: '7.14.1',
        minVersionRequired: '7.14.0',
      })
    ).toEqual(true);
  });

  it('should validate that a lower major version is not compatible with a higher major version', () => {
    expect(
      isVersionSupported({
        currentVersion: '8.14.0',
        minVersionRequired: '9.14.0',
      })
    ).toEqual(false);
  });

  it('should validate that a lower minor version is not compatible with a higher minor version', () => {
    expect(
      isVersionSupported({
        currentVersion: '7.13.0',
        minVersionRequired: '7.14.0',
      })
    ).toEqual(false);
  });

  it('should validate that a lower patch version is not compatible with a higher patch version', () => {
    expect(
      isVersionSupported({
        currentVersion: '7.14.0',
        minVersionRequired: '7.14.1',
      })
    ).toEqual(false);
  });

  it('should validate that the same versions are compatible', () => {
    expect(
      isVersionSupported({
        currentVersion: '7.14.0',
        minVersionRequired: '7.14.0',
      })
    ).toEqual(true);
  });

  it('should validate correctly with a SNAPSHOT version', () => {
    expect(
      isVersionSupported({
        currentVersion: '7.14.0-SNAPSHOT',
        minVersionRequired: '7.14.0',
      })
    ).toEqual(true);
  });
});

describe('Host Isolation utils isOsSupported', () => {
  it('should validate that the OS is compatible if the support array contains the currentOs', () => {
    expect(
      isOsSupported({
        currentOs: 'linux',
        supportedOss: ['macos', 'linux'],
      })
    ).toEqual(true);
  });

  it('should validate that the OS is not compatible if the support array does not contain the currentOs', () => {
    expect(
      isOsSupported({
        currentOs: 'linux',
        supportedOss: ['macos', 'windows'],
      })
    ).toEqual(false);
  });
});

describe('Host Isolation utils isIsolationSupported', () => {
  it('should be supported with a compatible os and version', () => {
    expect(
      isIsolationSupported({
        osName: 'windows',
        version: '7.14.0',
      })
    ).toEqual(true);
  });

  it('should not be supported with a incompatible os and version', () => {
    expect(
      isIsolationSupported({
        osName: 'linux',
        version: '7.13.0',
      })
    ).toEqual(false);
  });

  it('should not be supported with a incompatible os and compatible version', () => {
    expect(
      isIsolationSupported({
        osName: 'linux',
        version: '7.14.0',
      })
    ).toEqual(false);
  });

  it('should not be supported with a compatible os and incompatible version', () => {
    expect(
      isIsolationSupported({
        osName: 'macos',
        version: '7.13.0',
      })
    ).toEqual(false);
  });
});
