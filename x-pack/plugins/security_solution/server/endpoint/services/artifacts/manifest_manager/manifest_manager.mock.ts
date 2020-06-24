/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { loggerMock } from '../../../../../../../../src/core/server/logging/logger.mock';

import { savedObjectsClientMock } from '../../../../../../../../src/core/server/mocks';
import { Manifest } from '../../../lib/artifacts';
import { ManifestManager } from './manifest_manager';

// TODO
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getExceptionListClientMock } from '../../../../../../lists/server/services/exception_lists/exception_list_client.mock';

import { getInternalArtifactMock, getInternalArtifactsMock } from '../../../schemas';
import { getArtifactClientMock } from '../artifact_client.mock';
import { getManifestClientMock } from '../manifest_client.mock';

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
  private getManifestClient = jest.fn().mockValue(getManifestClientMock());
}

export const getManifestManagerMock = (): ManifestManagerMock => {
  return new ManifestManagerMock({
    artifactClient: getArtifactClientMock(),
    exceptionListClient: getExceptionListClientMock(),
    savedObjectsClient: savedObjectsClientMock.create(),
    logger: loggerMock.create(),
  });
};
