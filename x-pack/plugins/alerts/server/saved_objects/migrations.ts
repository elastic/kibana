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
import { RawAlert } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

export function getMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationMap {
  return {
    '7.9.0': changeAlertingConsumer(encryptedSavedObjects),
  };
}

/**
 * In v7.9.0 we changed the Alerting plugin so it uses the `consumer` value of `alerts`
 * prior to that we were using `alerting` and we need to keep these in sync
 */
function changeAlertingConsumer(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationFn<RawAlert, RawAlert> {
  const consumerMigration = new Map<string, string>();
  consumerMigration.set('alerting', 'alerts');

  return encryptedSavedObjects.createMigration<RawAlert, RawAlert>(
    function shouldBeMigrated(doc): doc is SavedObjectUnsanitizedDoc<RawAlert> {
      return consumerMigration.has(doc.attributes.consumer);
    },
    (doc: SavedObjectUnsanitizedDoc<RawAlert>): SavedObjectUnsanitizedDoc<RawAlert> => {
      const {
        attributes: { consumer },
      } = doc;
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          consumer: consumerMigration.get(consumer) ?? consumer,
        },
      };
    }
  );
}
