/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock, loggingSystemMock } from 'src/core/server/mocks';
import { Logger } from 'src/core/server';
import { createPackageConfigMock } from '../../../../../../ingest_manager/common/mocks';
import { PackageConfigServiceInterface } from '../../../../../../ingest_manager/server';
import { createPackageConfigServiceMock } from '../../../../../../ingest_manager/server/mocks';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import { listMock } from '../../../../../../lists/server/mocks';
import {
  ExceptionsCache,
  Manifest,
  buildArtifact,
  getFullEndpointExceptionList,
} from '../../../lib/artifacts';
import { ManifestConstants } from '../../../lib/artifacts/common';
import { InternalArtifactSchema } from '../../../schemas/artifacts';
import { getArtifactClientMock } from '../artifact_client.mock';
import { getManifestClientMock } from '../manifest_client.mock';
import { ManifestManager } from './manifest_manager';

async function mockBuildExceptionListArtifacts(
  os: string,
  schemaVersion: string
): Promise<InternalArtifactSchema[]> {
  const mockExceptionClient = listMock.getExceptionListClient();
  const first = getFoundExceptionListItemSchemaMock();
  mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);
  const exceptions = await getFullEndpointExceptionList(mockExceptionClient, os, schemaVersion);
  return [await buildArtifact(exceptions, os, schemaVersion)];
}

export class ManifestManagerMock extends ManifestManager {
  protected buildExceptionListArtifacts = jest
    .fn()
    .mockResolvedValue(mockBuildExceptionListArtifacts('linux', 'v1'));

  public getLastDispatchedManifest = jest
    .fn()
    .mockResolvedValue(new Manifest(new Date(), 'v1', ManifestConstants.INITIAL_VERSION));

  protected getManifestClient = jest
    .fn()
    .mockReturnValue(getManifestClientMock(this.savedObjectsClient));
}

export const getManifestManagerMock = (opts?: {
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
