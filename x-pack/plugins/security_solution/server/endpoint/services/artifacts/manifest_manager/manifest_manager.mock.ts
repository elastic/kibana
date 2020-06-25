/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../../../../src/core/server';
import {
  loggingSystemMock,
  savedObjectsClientMock,
} from '../../../../../../../../src/core/server/mocks';

import { listMock } from '../../../../../../lists/server/mocks';

import { Manifest } from '../../../lib/artifacts';
import { getInternalArtifactMock, getInternalArtifactsMock } from '../../../schemas';

import { getArtifactClientMock } from '../artifact_client.mock';
import { getManifestClientMock } from '../manifest_client.mock';

import { ManifestManager } from './manifest_manager';

function mockBuildExceptionListArtifacts() {
  // mock buildArtifactFunction
  // pass in OS, mock implementation of ExceptionListItemSchemaMock more than once
  // getInternalArtifactsMock()
}

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
    savedObjectsClient: savedObjectsClientMock.create(),
    logger: loggingSystemMock.create().get() as jest.Mocked<Logger>,
  });
};
