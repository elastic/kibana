/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsServiceStart, KibanaRequest } from 'kibana/server';
import { SavedObjectsClient } from '../../../../../src/core/server';
import { ML_SAVED_OBJECT_TYPE } from '../../common/types/saved_objects';

export function savedObjectClientsFactory(
  getSavedObjectsStart: () => SavedObjectsServiceStart | null
) {
  return {
    // create a saved object client scoped to the current request
    // which has access to ml-job objects
    getMlSavedObjectsClient: (request: KibanaRequest) => {
      const savedObjectsStart = getSavedObjectsStart();
      if (savedObjectsStart === null) {
        return null;
      }
      return savedObjectsStart.getScopedClient(request, {
        includedHiddenTypes: [ML_SAVED_OBJECT_TYPE],
      });
    },
    // create a saved object client which has access to all saved objects
    // no matter the space access of the current user.
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
