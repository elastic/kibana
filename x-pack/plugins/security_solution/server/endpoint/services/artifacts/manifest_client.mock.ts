/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from '../../../../../../../src/core/server/mocks';

import { ManifestClient } from './manifest_client';
import { getInternalManifestMock } from '../../schemas';

export class ManifestClientMock extends ManifestClient {
  public createManifest = jest.fn().mockResolvedValue(getInternalManifestMock());
  public getManifest = jest.fn().mockResolvedValue(getInternalManifestMock());
  public updateManifest = jest.fn().mockResolvedValue(getInternalManifestMock());
  public deleteManifest = jest.fn().mockResolvedValue(getInternalManifestMock());
}

export const getManifestClientMock = (): ManifestClientMock => {
  return new ManifestClientMock(savedObjectsClientMock.create(), '1.0.0');
};
