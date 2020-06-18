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
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectTypeRegistration,
} from '../../../encrypted_saved_objects/server';

export function getMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  currentType: EncryptedSavedObjectTypeRegistration
): SavedObjectMigrationMap {
  return {
    '7.9.0': changeAlertingConsumer(encryptedSavedObjects, currentType),
  };
}

/**
 * In v7.9 we made a couple of changes:
 * 1. We changed the Alerting plugin so it uses the `consumer` value of `alerts`
 * Prior to that we were using `alerting` and we need to keep these in sync for RBAC
 * 2. We aligned the metrics alerts with the feature that needs to grant them privileges
 * so their consumer field has changed from `metrics` to `infrastructure`
 */
function changeAlertingConsumer(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  currentType: EncryptedSavedObjectTypeRegistration
): SavedObjectMigrationFn<RawAlert, RawAlert> {
  const consumerMigration = new Map<string, string>();
  consumerMigration.set('alerting', 'alerts');
  consumerMigration.set('metrics', 'infrastructure');

  return encryptedSavedObjects.createMigration<RawAlert, RawAlert>(
    function shouldbeMigrated(doc): doc is SavedObjectUnsanitizedDoc<RawAlert> {
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
    },
    // type hasn't changed as the field we're updating is not an encrupted one
    currentType
  );
}
