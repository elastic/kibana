/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
} from '../../../../../src/core/server';
import { RawAction } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

export function getMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationMap {
  return { '7.10.0': addHasAuthConfigurationObject(encryptedSavedObjects) };
}

const addHasAuthConfigurationObject = (
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationFn<RawAction, RawAction> => {
  return encryptedSavedObjects.createMigration<RawAction, RawAction>(
    (doc): doc is SavedObjectUnsanitizedDoc<RawAction> => doc.attributes.actionTypeId === '.email',
    (doc: SavedObjectUnsanitizedDoc<RawAction>): SavedObjectUnsanitizedDoc<RawAction> => {
      const hasAuth = Object.keys(doc.attributes.secrets).length > 0;
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          config: {
            ...doc.attributes.config,
            hasAuth,
          },
        },
      };
    }
  );
};
