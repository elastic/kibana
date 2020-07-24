/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock, loggingSystemMock } from 'src/core/server/mocks';
import { Logger } from 'src/core/server';
import { PackageConfigServiceInterface } from '../../../../../../ingest_manager/server';
import { createPackageConfigServiceMock } from '../../../../../../ingest_manager/server/mocks';
import { listMock } from '../../../../../../lists/server/mocks';
import LRU from 'lru-cache';
import { getArtifactClientMock } from '../artifact_client.mock';
import { getManifestClientMock } from '../manifest_client.mock';
import { ManifestManager } from './manifest_manager';
import {
  createPackageConfigWithManifestMock,
  createPackageConfigWithInitialManifestMock,
  getMockManifest,
  getMockArtifactsWithDiff,
  getEmptyMockArtifacts,
} from '../../../lib/artifacts/mocks';

export enum ManifestManagerMockType {
  InitialSystemState,
  NormalFlow,
}

export const getManifestManagerMock = (opts?: {
  mockType?: ManifestManagerMockType;
  cache?: LRU<string, Buffer>;
  packageConfigService?: jest.Mocked<PackageConfigServiceInterface>;
  savedObjectsClient?: ReturnType<typeof savedObjectsClientMock.create>;
}): ManifestManager => {
  let cache = new LRU<string, Buffer>({ max: 10, maxAge: 1000 * 60 * 60 });
  if (opts?.cache !== undefined) {
    cache = opts.cache;
  }

  let packageConfigService = createPackageConfigServiceMock();
  if (opts?.packageConfigService !== undefined) {
    packageConfigService = opts.packageConfigService;
  }
  packageConfigService.list = jest.fn().mockResolvedValue({
    total: 1,
    items: [
      { version: 'policy-1-version', ...createPackageConfigWithManifestMock() },
      { version: 'policy-2-version', ...createPackageConfigWithInitialManifestMock() },
      { version: 'policy-3-version', ...createPackageConfigWithInitialManifestMock() },
    ],
  });

  let savedObjectsClient = savedObjectsClientMock.create();
  if (opts?.savedObjectsClient !== undefined) {
    savedObjectsClient = opts.savedObjectsClient;
  }

  class ManifestManagerMock extends ManifestManager {
    protected buildExceptionListArtifacts = jest.fn().mockImplementation(() => {
      const mockType = opts?.mockType ?? ManifestManagerMockType.NormalFlow;
      switch (mockType) {
        case ManifestManagerMockType.InitialSystemState:
          return getEmptyMockArtifacts();
        case ManifestManagerMockType.NormalFlow:
          return getMockArtifactsWithDiff();
      }
    });

    public getLastComputedManifest = jest.fn().mockImplementation(() => {
      const mockType = opts?.mockType ?? ManifestManagerMockType.NormalFlow;
      switch (mockType) {
        case ManifestManagerMockType.InitialSystemState:
          return null;
        case ManifestManagerMockType.NormalFlow:
          return getMockManifest({ compress: true });
      }
    });

    protected getManifestClient = jest
      .fn()
      .mockReturnValue(getManifestClientMock(this.savedObjectsClient));
  }

  const manifestManager = new ManifestManagerMock({
    artifactClient: getArtifactClientMock(savedObjectsClient),
    cache,
    packageConfigService,
    exceptionListClient: listMock.getExceptionListClient(),
    logger: loggingSystemMock.create().get() as jest.Mocked<Logger>,
    savedObjectsClient,
  });

  return manifestManager;
};
