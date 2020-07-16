/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
import { savedObjectsClientMock, loggingSystemMock } from 'src/core/server/mocks';
import { Logger } from 'src/core/server';
import { createPackageConfigMock } from '../../../../../../ingest_manager/common/mocks';
import { PackageConfigServiceInterface } from '../../../../../../ingest_manager/server';
import { createPackageConfigServiceMock } from '../../../../../../ingest_manager/server/mocks';
import { listMock } from '../../../../../../lists/server/mocks';
import { ExceptionsCache } from '../../../lib/artifacts';
import { getArtifactClientMock } from '../artifact_client.mock';
import { getManifestClientMock } from '../manifest_client.mock';
import { ManifestManager } from './manifest_manager';
import {
  getMockManifest,
  getMockArtifactsWithDiff,
  getEmptyMockArtifacts,
} from '../../../lib/artifacts/mocks';

export class ManifestManagerMock extends ManifestManager {
  protected buildExceptionListArtifacts = jest.fn().mockResolvedValue(getMockArtifactsWithDiff());

  public getLastComputedManifest = jest.fn().mockResolvedValue(getMockManifest({ compress: true }));

  protected getManifestClient = jest
    .fn()
    .mockReturnValue(getManifestClientMock(this.savedObjectsClient));
}

export class EmptyManifestManagerMock extends ManifestManagerMock {
  protected buildExceptionListArtifacts = jest.fn().mockResolvedValue(getEmptyMockArtifacts());

  public getLastComputedManifest = jest.fn().mockResolvedValue(null);
}

export const getManifestManagerMock = (opts?: {
  empty?: boolean;
  cache?: ExceptionsCache;
  packageConfigService?: jest.Mocked<PackageConfigServiceInterface>;
  savedObjectsClient?: ReturnType<typeof savedObjectsClientMock.create>;
}): ManifestManagerMock => {
  let cache = new ExceptionsCache(5);
  if (opts?.cache !== undefined) {
    cache = opts.cache;
  }

  let packageConfigService = createPackageConfigServiceMock();
  if (opts?.packageConfigService !== undefined) {
    packageConfigService = opts.packageConfigService;
  }
  packageConfigService.list = jest.fn().mockResolvedValue({
    total: 1,
    items: [{ version: 'abcd', ...createPackageConfigMock() }],
  });

  let savedObjectsClient = savedObjectsClientMock.create();
  if (opts?.savedObjectsClient !== undefined) {
    savedObjectsClient = opts.savedObjectsClient;
  }

  const ManifestClass = opts?.empty ? EmptyManifestManagerMock : ManifestManagerMock;

  const manifestManager = new ManifestClass({
    artifactClient: getArtifactClientMock(savedObjectsClient),
    cache,
    packageConfigService,
    exceptionListClient: listMock.getExceptionListClient(),
    logger: loggingSystemMock.create().get() as jest.Mocked<Logger>,
    savedObjectsClient,
  });

  return manifestManager;
};
