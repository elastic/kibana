/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManifestManager } from './artifact_client';

import { getInternalArtifactMock, getInternalArtifactsMock } from '../../../schemas';

function mockBuildExceptionListArtifacts() {
  // mock buildArtifactFunction
  // pass in OS, mock implementation of ExceptionListItemSchemaMock more than once
  // getInternalArtifactsMock()
}

/*
export class ManifestManagerMock extends ManifestManager {
  private buildExceptionListArtifacts = jest
    .fn()
    .mockResolvedValue(mockBuildExceptionListArtifacts());
  private getLastDispatchedManifest = jest.fn().mockResolvedValue(getManifestMock());
  private getManifestClient = jest.fn().mockValue(getManifestClientMock());
}

export const getManifestManagerMock = (): ManifestManager => {
  const mock = new ManifestManager({
    artifactClient: getArtifactClientMock(),
    exceptionListClient: getExceptionListClientMock(),
    savedObjectsClient: savedObjectsClientMock.create(),
    logger: loggerMock.create(),
  });
};
*/
