/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
import { savedObjectsClientMock, loggingSystemMock } from 'src/core/server/mocks';
import { Logger } from 'src/core/server';
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

function getMockPackageConfig() {
  return {
    id: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
    inputs: [
      {
        config: {},
      },
    ],
    revision: 1,
    version: 'abcd', // TODO: not yet implemented in ingest_manager (https://github.com/elastic/kibana/issues/69992)
    updated_at: '2020-06-25T16:03:38.159292',
    updated_by: 'kibana',
    created_at: '2020-06-25T16:03:38.159292',
    created_by: 'kibana',
  };
}

class PackageConfigServiceMock {
  public create = jest.fn().mockResolvedValue(getMockPackageConfig());
  public get = jest.fn().mockResolvedValue(getMockPackageConfig());
  public getByIds = jest.fn().mockResolvedValue([getMockPackageConfig()]);
  public list = jest.fn().mockResolvedValue({
    items: [getMockPackageConfig()],
    total: 1,
    page: 1,
    perPage: 20,
  });
  public update = jest.fn().mockResolvedValue(getMockPackageConfig());
}

export function getPackageConfigServiceMock() {
  return new PackageConfigServiceMock();
}

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

// @ts-ignore
export class ManifestManagerMock extends ManifestManager {
  // @ts-ignore
  private buildExceptionListArtifacts = async () => {
    return mockBuildExceptionListArtifacts('linux', 'v1');
  };

  // @ts-ignore
  private getLastDispatchedManifest = jest
    .fn()
    .mockResolvedValue(new Manifest(new Date(), 'v1', ManifestConstants.INITIAL_VERSION));

  // @ts-ignore
  private getManifestClient = jest
    .fn()
    .mockReturnValue(getManifestClientMock(this.savedObjectsClient));
}

export const getManifestManagerMock = (opts?: {
  cache?: ExceptionsCache;
  packageConfigService?: PackageConfigServiceMock;
  savedObjectsClient?: ReturnType<typeof savedObjectsClientMock.create>;
}): ManifestManagerMock => {
  let cache = new ExceptionsCache(5);
  if (opts?.cache !== undefined) {
    cache = opts.cache;
  }

  let packageConfigService = getPackageConfigServiceMock();
  if (opts?.packageConfigService !== undefined) {
    packageConfigService = opts.packageConfigService;
  }

  let savedObjectsClient = savedObjectsClientMock.create();
  if (opts?.savedObjectsClient !== undefined) {
    savedObjectsClient = opts.savedObjectsClient;
  }

  const manifestManager = new ManifestManagerMock({
    artifactClient: getArtifactClientMock(savedObjectsClient),
    cache,
    // @ts-ignore
    packageConfigService,
    exceptionListClient: listMock.getExceptionListClient(),
    logger: loggingSystemMock.create().get() as jest.Mocked<Logger>,
    savedObjectsClient,
  });

  return manifestManager;
};
