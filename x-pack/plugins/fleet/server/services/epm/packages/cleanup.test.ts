/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from 'kibana/server';
import { savedObjectsRepositoryMock } from 'src/core/server/mocks';

import type { PackagePolicyServiceInterface } from '../../package_policy';
import * as storage from '../archive/storage';
import { packagePolicyService } from '../../package_policy';

import { removeOldAssets } from './cleanup';

jest.mock('../..', () => ({
  appContextService: {
    getLogger: () => ({
      debug: jest.fn(),
    }),
  },
}));

jest.mock('../../package_policy');

describe(' Cleanup old assets', () => {
  let soRepo: jest.Mocked<ISavedObjectsRepository>;
  const packagePolicyServiceMock =
    packagePolicyService as jest.Mocked<PackagePolicyServiceInterface>;
  let removeArchiveEntriesMock: jest.MockedFunction<typeof storage.removeArchiveEntries>;

  function mockFindVersions(versions: string[]) {
    soRepo.find.mockResolvedValue({
      page: 0,
      per_page: 0,
      total: 0,
      saved_objects: [],
      aggregations: {
        versions: {
          buckets: versions.map((v) => ({ key: '0.3.3' })),
        },
      },
    });
  }

  beforeEach(() => {
    soRepo = savedObjectsRepositoryMock.create();
    packagePolicyServiceMock.list.mockClear();
    removeArchiveEntriesMock = jest.spyOn(storage, 'removeArchiveEntries') as any;
    removeArchiveEntriesMock.mockClear();
  });
  it('should remove old assets from 2 versions if none of the policies are using it', async () => {
    mockFindVersions(['0.3.3', '0.3.4']);
    packagePolicyServiceMock.list.mockResolvedValue({ total: 0, items: [], page: 0, perPage: 0 });
    soRepo.createPointInTimeFinder = jest.fn().mockResolvedValue({
      close: jest.fn(),
      find: function* asyncGenerator() {
        yield { saved_objects: [{ id: '1' }, { id: '2' }] };
      },
    });

    await removeOldAssets({ soRepo, pkgName: 'apache', currentVersion: '1.0.0' });

    expect(removeArchiveEntriesMock).toHaveBeenCalledWith({
      savedObjectsRepo: soRepo,
      refs: [
        { id: '1', type: 'epm-packages-assets' },
        { id: '2', type: 'epm-packages-assets' },
      ],
    });
    expect(removeArchiveEntriesMock).toHaveBeenCalledTimes(2);
  });

  it('should not remove old assets if used by policies', async () => {
    mockFindVersions(['0.3.3']);
    packagePolicyServiceMock.list.mockResolvedValue({ total: 1, items: [], page: 0, perPage: 0 });

    await removeOldAssets({ soRepo, pkgName: 'apache', currentVersion: '1.0.0' });

    expect(removeArchiveEntriesMock).not.toHaveBeenCalled();
  });

  it('should remove old assets from all pages', async () => {
    mockFindVersions(['0.3.3']);
    packagePolicyServiceMock.list.mockResolvedValue({ total: 0, items: [], page: 0, perPage: 0 });
    soRepo.createPointInTimeFinder = jest.fn().mockResolvedValue({
      close: jest.fn(),
      find: function* asyncGenerator() {
        yield { saved_objects: [{ id: '1' }, { id: '2' }] };
        yield { saved_objects: [{ id: '3' }] };
      },
    });

    await removeOldAssets({ soRepo, pkgName: 'apache', currentVersion: '1.0.0' });

    expect(removeArchiveEntriesMock).toHaveBeenCalledWith({
      savedObjectsRepo: soRepo,
      refs: [
        { id: '1', type: 'epm-packages-assets' },
        { id: '2', type: 'epm-packages-assets' },
      ],
    });
    expect(removeArchiveEntriesMock).toHaveBeenCalledWith({
      savedObjectsRepo: soRepo,
      refs: [{ id: '3', type: 'epm-packages-assets' }],
    });
    expect(removeArchiveEntriesMock).toHaveBeenCalledTimes(2);
  });
});
