/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, SavedObjectsClient } from 'kibana/server';

export async function getInternalSavedObjectsClient(core: CoreSetup) {
  return core.getStartServices().then(async ([coreStart]) => {
    // TODO: is this safe?
    return (coreStart.savedObjects.createInternalRepository() as unknown) as SavedObjectsClient;
  });
}
