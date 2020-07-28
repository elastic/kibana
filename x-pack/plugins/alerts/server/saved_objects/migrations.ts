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
    /**
     * In v7.9.0 we changed the Alerting plugin so it uses the `consumer` value of `alerts`
     * prior to that we were using `alerting` and we need to keep these in sync
     */
    '7.9.0': changeAlertingConsumer(encryptedSavedObjects, 'alerting', 'alerts'),
    /**
     * In v7.10.0 we changed the Matrics plugin so it uses the `consumer` value of `infrastructure`
     * prior to that we were using `metrics` and we need to keep these in sync
     */
    '7.10.0': changeAlertingConsumer(encryptedSavedObjects, 'metrics', 'infrastructure'),
  };
}

function changeAlertingConsumer(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  from: string,
  to: string
): SavedObjectMigrationFn<RawAlert, RawAlert> {
  return encryptedSavedObjects.createMigration<RawAlert, RawAlert>(
    function shouldBeMigrated(doc): doc is SavedObjectUnsanitizedDoc<RawAlert> {
      return doc.attributes.consumer === from;
    },
    (doc: SavedObjectUnsanitizedDoc<RawAlert>): SavedObjectUnsanitizedDoc<RawAlert> => {
      const {
        attributes: { consumer },
      } = doc;
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          consumer: consumer === from ? to : consumer,
        },
      };
    }
  );
}
