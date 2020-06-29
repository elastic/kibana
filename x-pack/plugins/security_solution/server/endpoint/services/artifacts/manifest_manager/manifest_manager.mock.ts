/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
import { Logger } from '../../../../../../../../src/core/server';
import {
  loggingSystemMock,
  savedObjectsClientMock,
} from '../../../../../../../../src/core/server/mocks';

import { DatasourceServiceInterface } from '../../../../../../ingest_manager/server';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import { listMock } from '../../../../../../lists/server/mocks';

import {
  ExceptionsCache,
  Manifest,
  buildArtifact,
  getFullEndpointExceptionList,
} from '../../../lib/artifacts';
import { getInternalArtifactMock, getInternalArtifactsMock } from '../../../schemas';

import { getArtifactClientMock } from '../artifact_client.mock';
import { getManifestClientMock } from '../manifest_client.mock';

import { ManifestManager } from './manifest_manager';

function getMockDatasource() {
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

// TODO
// eslint-disable-next-line max-classes-per-file
class DatasourceServiceMock {
  public create = jest.fn().mockResolvedValue(getMockDatasource());
  public get = jest.fn().mockResolvedValue(getMockDatasource());
  public getByIds = jest.fn().mockResolvedValue([getMockDatasource()]);
  public list = jest.fn().mockResolvedValue({
    items: [getMockDatasource()],
    total: 1,
    page: 1,
    perPage: 20,
  });
  public update = jest.fn().mockResolvedValue(getMockDatasource());
}

export function getDatasourceServiceMock() {
  return new DatasourceServiceMock();
}

async function mockBuildExceptionListArtifacts(
  os: string,
  schemaVersion: string
): InternalArtifactSchema[] {
  const mockExceptionClient = listMock.getExceptionListClient();
  const first = getFoundExceptionListItemSchemaMock();
  mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);
  const exceptions = await getFullEndpointExceptionList(mockExceptionClient, os, schemaVersion);
  return [await buildArtifact(exceptions, os, schemaVersion)];
}

// TODO
// eslint-disable-next-line max-classes-per-file
export class ManifestManagerMock extends ManifestManager {
  private buildExceptionListArtifacts = async () => {
    return mockBuildExceptionListArtifacts('linux', '1.0.0');
  };

  private getLastDispatchedManifest = jest
    .fn()
    .mockResolvedValue(new Manifest(new Date(), '1.0.0'));

  private getManifestClient = jest.fn().mockReturnValue(getManifestClientMock());
}

export const getManifestManagerMock = (opts: {
  artifactClientMock?: ArtifactClient;
  datasourceServiceMock?: DatasourceServiceMock;
  manifestClientMock?: ManifestClient;
}): ManifestManagerMock => {
  let artifactClient = getArtifactClientMock();
  if (opts?.artifactClientMock !== undefined) {
    artifactClient = opts.artifactClientMock;
  }

  let datasourceService = getDatasourceServiceMock();
  if (opts?.datasourceServiceMock !== undefined) {
    datasourceService = opts.datasourceServiceMock;
  }

  // TODO: use the manifestClient
  let manifestClient = getManifestClientMock();
  if (opts?.manifestClientMock !== undefined) {
    manifestClient = opts.manifestClientMock;
  }

  return new ManifestManagerMock({
    artifactClient,
    cache: new ExceptionsCache(5),
    exceptionListClient: listMock.getExceptionListClient(),
    datasourceService,
    savedObjectsClient: savedObjectsClientMock.create(),
    logger: loggingSystemMock.create().get() as jest.Mocked<Logger>,
  });
};
