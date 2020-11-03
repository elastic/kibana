/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/server';
import { SavedObjectsClient } from '../../../../../src/core/server';

export function getInternalSavedObjectsClient(core: CoreStart) {
  const savedObjectsRepo = core.savedObjects.createInternalRepository();
  return new SavedObjectsClient(savedObjectsRepo);
}
