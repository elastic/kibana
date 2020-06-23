/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManifestClient } from './manifest_service';
import { getInternalManifestSchemaMock } from '../../schemas';

export class ManifestClientMock extends ManifestClient {
  public createManifest = jest.fn().mockResolvedValue(getInternalManifestSchemaMock());
  public getManifest = jest.fn().mockResolvedValue(getInternalManifestSchemaMock());
  public updateManifest = jest.fn().mockResolvedValue(getInternalManifestSchemaMock());
  public deleteManifest = jest.fn().mockResolvedValue(getInternalManifestSchemaMock());
}
