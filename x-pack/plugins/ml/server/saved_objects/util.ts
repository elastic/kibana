/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsServiceStart, KibanaRequest } from 'kibana/server';
import { SavedObjectsClient } from '../../../../../src/core/server';

export function savedObjectClientsFactory(
  getSavedObjectsStart: () => SavedObjectsServiceStart | null
) {
  return {
    getMlSavedObjectsClient: (request: KibanaRequest) => {
      const savedObjectsStart = getSavedObjectsStart();
      if (savedObjectsStart === null) {
        return null;
      }
      return savedObjectsStart.getScopedClient(request, {
        includedHiddenTypes: ['ml-job'],
      });
    },
    getInternalSavedObjectsClient: () => {
      const savedObjectsStart = getSavedObjectsStart();
      if (savedObjectsStart === null) {
        return null;
      }
      const savedObjectsRepo = savedObjectsStart.createInternalRepository();
      return new SavedObjectsClient(savedObjectsRepo);
    },
  };
}
