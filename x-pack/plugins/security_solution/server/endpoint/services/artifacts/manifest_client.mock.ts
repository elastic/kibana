/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { ManifestClient } from './manifest_client';

export const getManifestClientMock = (
  savedObjectsClient?: SavedObjectsClientContract
): ManifestClient => {
  if (savedObjectsClient !== undefined) {
    return new ManifestClient(savedObjectsClient, '1.0.0');
  }
  return new ManifestClient(savedObjectsClientMock.create(), '1.0.0');
};
