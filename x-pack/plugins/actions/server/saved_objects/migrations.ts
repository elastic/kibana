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
  return { '7.10.0': renameCasesConfigurationObject(encryptedSavedObjects) };
}

const renameCasesConfigurationObject = (
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationFn<RawAction, RawAction> => {
  return encryptedSavedObjects.createMigration<RawAction, RawAction>(
    (doc): doc is SavedObjectUnsanitizedDoc<RawAction> =>
      !!doc.attributes.config?.casesConfiguration,
    (doc: SavedObjectUnsanitizedDoc<RawAction>): SavedObjectUnsanitizedDoc<RawAction> => {
      const { casesConfiguration, ...restConfiguration } = doc.attributes.config;

      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          config: {
            ...restConfiguration,
            incidentConfiguration: { ...(casesConfiguration as object) },
          },
        },
      };
    }
  );
};
