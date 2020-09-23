/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
} from '../../../../../src/core/server';
import { RawAction } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

export function getMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationMap {
  const migrationHasAuthConfigurationObject = addHasAuthConfigurationObject(encryptedSavedObjects);

  return {
    '7.10.0': executeMigrationWithErrorHandling(migrationHasAuthConfigurationObject, '7.10.0'),
  };
}

function executeMigrationWithErrorHandling(
  migrationFunc: SavedObjectMigrationFn<RawAction, RawAction>,
  version: string
) {
  return (doc: SavedObjectUnsanitizedDoc<RawAction>, context: SavedObjectMigrationContext) => {
    try {
      return migrationFunc(doc, context);
    } catch (ex) {
      context.log.error(
        `encryptedSavedObject ${version} migration failed for action ${doc.id} with error: ${ex.message}`,
        { actionDocument: doc }
      );
    }
    return doc;
  };
}

const addHasAuthConfigurationObject = (
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationFn<RawAction, RawAction> => {
  return encryptedSavedObjects.createMigration<RawAction, RawAction>(
    (doc): doc is SavedObjectUnsanitizedDoc<RawAction> => doc.attributes.actionTypeId === '.email',
    (doc: SavedObjectUnsanitizedDoc<RawAction>): SavedObjectUnsanitizedDoc<RawAction> => {
      const hasAuth = !!doc.attributes.secrets.user || !!doc.attributes.secrets.password;
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
