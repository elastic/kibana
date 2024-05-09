/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { PackageNotFoundError, RegistryResponseError } from '../../../errors';
import * as Archive from '../archive';

import {
  splitPkgKey,
  fetchFindLatestPackageOrUndefined,
  fetchFindLatestPackageOrThrow,
  fetchInfo,
  getLicensePath,
  fetchCategories,
  fetchList,
} from '.';

const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');
const mockGetConfig = jest.fn();

const mockGetBundledPackageByName = jest.fn();
const mockFetchUrl = jest.fn();

const MockArchive = Archive as jest.Mocked<typeof Archive>;

jest.mock('../archive');

jest.mock('../..', () => ({
  appContextService: {
    getLogger: () => mockLogger,
    getKibanaBranch: () => 'main',
    getKibanaVersion: () => '99.0.0',
    getConfig: () => mockGetConfig(),
    getIsProductionMode: () => false,
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

      await expect(() => fetchFindLatestPackageOrThrow('testpkg')).rejects.toBeInstanceOf(
        PackageNotFoundError
      );
    });
  });
});

describe('getLicensePath', () => {
  MockArchive.getPathParts = jest.requireActual('../archive').getPathParts;

  it('returns first license path if found', () => {
    const path = getLicensePath([
      '/package/good-1.0.0/NOTICE.txt',
      '/package/good-1.0.0/changelog.yml',
      '/package/good-1.0.0/manifest.yml',
      '/package/good-1.0.0/LICENSE.txt',
      '/package/good-1.0.0/docs/README.md',
    ]);
    expect(path).toEqual('/package/good/1.0.0/LICENSE.txt');
  });

  it('returns undefined if no license', () => {
    const path = getLicensePath([
      '/package/good-1.0.0/NOTICE.txt',
      '/package/good-1.0.0/changelog.yml',
      '/package/good-1.0.0/manifest.yml',
      '/package/good-1.0.0/docs/README.md',
    ]);
    expect(path).toEqual(undefined);
  });
});

describe('fetchInfo', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    mockFetchUrl.mockRejectedValueOnce(new RegistryResponseError('Not found', 404));
    mockGetBundledPackageByName.mockResolvedValueOnce({
      name: 'test-package',
      version: '1.0.0',
      getBuffer: async () => Buffer.from(''),
    });
    MockArchive.generatePackageInfoFromArchiveBuffer.mockResolvedValueOnce({
      paths: [],
      packageInfo: {
        name: 'test-package',
        title: 'Test Package',
        version: '1.0.0',
        description: 'Test package',
        owner: { github: 'elastic' },
        format_version: '1.0.0',
      },
    });
  });

  it('falls back to bundled package when one exists', async () => {
    const fetchedInfo = await fetchInfo('test-package', '1.0.0');
    expect(fetchedInfo).toBeTruthy();
  });

  it('throws when no corresponding bundled package exists', async () => {
    try {
      await fetchInfo('test-package', '1.0.0');
    } catch (e) {
      expect(e).toBeInstanceOf(PackageNotFoundError);
    }
  });
});

describe('fetchCategories', () => {
  beforeEach(() => {
    mockFetchUrl.mockReset();
    mockGetConfig.mockReset();
  });
  it('call registry with capabilities if configured', async () => {
    mockGetConfig.mockReturnValue({
      internal: {
        registry: {
          capabilities: ['apm', 'security'],
        },
      },
    });
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchCategories();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('capabilities')).toBe('apm,security');
  });
  it('call registry with spec.min spec.max if configured', async () => {
    mockGetConfig.mockReturnValue({
      internal: {
        registry: {
          spec: {
            min: '3.0',
            max: '3.0',
          },
          capabilities: [],
        },
      },
    });
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchCategories();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('spec.min')).toBe('3.0');
    expect(callUrl.searchParams.get('spec.max')).toBe('3.0');
  });
  it('does not call registry with capabilities if none are configured', async () => {
    mockGetConfig.mockReturnValue({});
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchCategories();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('capabilities')).toBeNull();
  });
});

describe('fetchList', () => {
  beforeEach(() => {
    mockFetchUrl.mockReset();
    mockGetConfig.mockReset();
  });
  it('call registry with capabilities if configured', async () => {
    mockGetConfig.mockReturnValue({
      internal: {
        registry: {
          capabilities: ['apm', 'security'],
        },
      },
    });
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchList();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('capabilities')).toBe('apm,security');
  });
  it('call registry with spec.min spec.max if configured', async () => {
    mockGetConfig.mockReturnValue({
      internal: {
        registry: {
          spec: {
            min: '3.0',
            max: '3.0',
          },
        },
      },
    });
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchList();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('spec.min')).toBe('3.0');
    expect(callUrl.searchParams.get('spec.max')).toBe('3.0');
  });

  it('does not call registry with capabilities if none are configured', async () => {
    mockGetConfig.mockReturnValue({});
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchList();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('capabilities')).toBeNull();
  });

  it('does call registry with kibana.version if not explictly disabled', async () => {
    mockGetConfig.mockReturnValue({
      internal: {
        registry: {},
      },
    });
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchList();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('kibana.version')).not.toBeNull();
  });

  it('does not call registry with kibana.version with config internal.registry.kibanaVersionCheckEnabled:false', async () => {
    mockGetConfig.mockReturnValue({
      internal: {
        registry: {
          kibanaVersionCheckEnabled: false,
        },
      },
    });
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchList();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('kibana.version')).toBeNull();
  });
});
