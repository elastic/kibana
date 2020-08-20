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
     * prior to that we were using `alerting` and we need to keep these in sync for RBAC to work in 7.10.
     * In v7.10.0 we changed the Matrics plugin so it uses the `consumer` value of `infrastructure`
     * prior to that we were using `metrics` and we need to keep these in sync for RBAC to work in 7.10.
     */
    '7.10.0': changeAlertingConsumer(
      encryptedSavedObjects,
      new Map(
        Object.entries({
          alerting: 'alerts',
          metrics: 'infrastructure',
        })
      )
    ),
  };
}

function changeAlertingConsumer(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  mapping: Map<string, string>
): SavedObjectMigrationFn<RawAlert, RawAlert> {
  return encryptedSavedObjects.createMigration<RawAlert, RawAlert>(
    function shouldBeMigrated(doc): doc is SavedObjectUnsanitizedDoc<RawAlert> {
      // migrate all documents in 7.10 in order to add the "meta" RBAC field
      return true;
    },
    (doc: SavedObjectUnsanitizedDoc<RawAlert>): SavedObjectUnsanitizedDoc<RawAlert> => {
      const {
        attributes: { consumer },
      } = doc;
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          consumer: mapping.get(consumer) ?? consumer,
          // mark any alert predating 7.10 as a legacy alert in terms of RBAC support
          meta: {
            rbac: 'legacy',
          },
        },
      };
    }
  );
}
