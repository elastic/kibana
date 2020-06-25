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
import { listMock } from '../../../../../../lists/server/mocks';

import { Manifest } from '../../../lib/artifacts';
import { getInternalArtifactMock, getInternalArtifactsMock } from '../../../schemas';

import { getArtifactClientMock } from '../artifact_client.mock';
import { getManifestClientMock } from '../manifest_client.mock';

import { ManifestManager } from './manifest_manager';

function getMockDatasource() {
  return {
    id: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
    inputs: [{}],
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
class DatasourceServiceMock extends DatasourceServiceInterface {
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

function getDatasourceServiceMock() {
  return new DatasourceServiceMock();
}

function mockBuildExceptionListArtifacts() {
  // mock buildArtifactFunction
  // pass in OS, mock implementation of ExceptionListItemSchemaMock more than once
  // getInternalArtifactsMock()
}

// TODO
// eslint-disable-next-line max-classes-per-file
export class ManifestManagerMock extends ManifestManager {
  private buildExceptionListArtifacts = jest
    .fn()
    .mockResolvedValue(mockBuildExceptionListArtifacts());
  private getLastDispatchedManifest = jest
    .fn()
    .mockResolvedValue(new Manifest(new Date(), '1.0.0'));
  private getManifestClient = jest.fn().mockReturnValue(getManifestClientMock());
}

export const getManifestManagerMock = (): ManifestManagerMock => {
  return new ManifestManagerMock({
    artifactClient: getArtifactClientMock(),
    exceptionListClient: listMock.getExceptionListClient(),
    datasourceService: getDatasourceServiceMock(),
    savedObjectsClient: savedObjectsClientMock.create(),
    logger: loggingSystemMock.create().get() as jest.Mocked<Logger>,
  });
};
