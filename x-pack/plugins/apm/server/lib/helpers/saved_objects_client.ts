/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { SavedObjectsClient as SavedObjectsClientClass } from '../../../../../../src/legacy/server/saved_objects';

export function getSavedObjectsClient(server: Server) {
  const { SavedObjectsClient, getSavedObjectsRepository } = server.savedObjects;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster(
    'admin'
  );
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);
  // return new SavedObjectsClient(internalRepository);
  //             ^- ERROR: Cannot use 'new' with an expression whose type lacks a call or construct signature.ts(2351)
  return new SavedObjectsClientClass(internalRepository); // Works!
}
