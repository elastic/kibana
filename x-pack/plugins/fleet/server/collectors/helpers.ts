/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/server';
import { SavedObjectsClient } from '../../../../../src/core/server';

export async function getInternalSavedObjectsClient(core: CoreSetup) {
  return core.getStartServices().then(async ([coreStart]) => {
    const savedObjectsRepo = coreStart.savedObjects.createInternalRepository();
    return new SavedObjectsClient(savedObjectsRepo);
  });
}
