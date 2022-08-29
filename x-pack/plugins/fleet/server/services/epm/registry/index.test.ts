/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { PackageNotFoundError } from '../../../errors';

import { splitPkgKey, fetchFindLatestPackageOrUndefined, fetchFindLatestPackageOrThrow } from '.';

const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');

const mockGetBundledPackageByName = jest.fn();
const mockFetchUrl = jest.fn();
jest.mock('../..', () => ({
  appContextService: {
    getLogger: () => mockLogger,
    getKibanaBranch: () => 'main',
    getKibanaVersion: () => '99.0.0',
    getConfig: () => ({}),
  },
}));

jest.mock('./requests', () => ({
  fetchUrl: (url: string) => mockFetchUrl(url),
}));

jest.mock('../packages/bundled_packages', () => ({
  getBundledPackageByName: (name: string) => mockGetBundledPackageByName(name),
}));

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

describe('fetch package', () => {
  afterEach(() => {
    mockFetchUrl.mockReset();
    mockGetBundledPackageByName.mockReset();
  });

  type FetchFn = typeof fetchFindLatestPackageOrThrow | typeof fetchFindLatestPackageOrUndefined;
  const performGenericFetchTests = (fetchMethodToTest: FetchFn) => {
    it('Should return registry package if bundled package is older version', async () => {
      const bundledPackage = { name: 'testpkg', version: '1.0.0' };
      const registryPackage = { name: 'testpkg', version: '1.0.1' };

      mockFetchUrl.mockResolvedValue(JSON.stringify([registryPackage]));

      mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
      const result = await fetchMethodToTest('testpkg');
      expect(result).toEqual(registryPackage);
    });

    it('Should return bundled package if bundled package is newer version', async () => {
      const bundledPackage = { name: 'testpkg', version: '1.0.1' };
      const registryPackage = { name: 'testpkg', version: '1.0.0' };

      mockFetchUrl.mockResolvedValue(JSON.stringify([registryPackage]));

      mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
      const result = await fetchMethodToTest('testpkg');
      expect(result).toEqual(bundledPackage);
    });
    it('Should return bundled package if there is no registry package', async () => {
      const bundledPackage = { name: 'testpkg', version: '1.0.1' };

      mockFetchUrl.mockResolvedValue(JSON.stringify([]));

      mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
      const result = await fetchMethodToTest('testpkg');
      expect(result).toEqual(bundledPackage);
    });

    it('Should fall back to bundled package if there is an error getting from the registry', async () => {
      const bundledPackage = { name: 'testpkg', version: '1.0.1' };

      mockFetchUrl.mockRejectedValue(new Error('Registry error'));

      mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
      const result = await fetchMethodToTest('testpkg');
      expect(result).toEqual(bundledPackage);
    });
  };

  describe('fetchFindLatestPackageOrUndefined', () => {
    performGenericFetchTests(fetchFindLatestPackageOrUndefined);
    it('Should return undefined if there is a registry error and no bundled package', async () => {
      const bundledPackage = null;

      mockFetchUrl.mockRejectedValue(new Error('Registry error'));

      mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
      const result = await fetchFindLatestPackageOrUndefined('testpkg');
      expect(result).toEqual(undefined);
    });
  });

  describe('fetchFindLatestPackageOrThrow', () => {
    performGenericFetchTests(fetchFindLatestPackageOrThrow);
    it('Should return undefined if there is a registry error and no bundled package', async () => {
      const bundledPackage = null;

      mockFetchUrl.mockRejectedValue(new Error('Registry error'));

      mockGetBundledPackageByName.mockResolvedValue(bundledPackage);

      expect(() => fetchFindLatestPackageOrThrow('testpkg')).rejects.toBeInstanceOf(
        PackageNotFoundError
      );
    });
  });
});
