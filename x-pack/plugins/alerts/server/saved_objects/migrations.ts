/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
  Logger
} from '../../../../../src/core/server';
import { RawAlert } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

export function getMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  eventLogger: Logger
): SavedObjectMigrationMap {
  const migrations: SavedObjectMigrationMap = {};

  const alertsMigration = changeAlertingConsumer(encryptedSavedObjects, 'alerting', 'alerts', eventLogger);
  if (alertsMigration) {
    migrations['7.9.0'] = alertsMigration;
  }

  const infrastructureMigration = changeAlertingConsumer(encryptedSavedObjects, 'metrics', 'infrastructure', eventLogger);
  if (infrastructureMigration) {
    migrations['7.10.0'] = infrastructureMigration;
  }
  return migrations;
}

function changeAlertingConsumer(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  from: string,
  to: string,
  eventLogger: Logger
): SavedObjectMigrationFn<RawAlert, RawAlert> | undefined {
  try {
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
  } catch (ex) {
    eventLogger.error(`encryptedSavedObject migration from ${from} to ${to} failed with error: ${ex.message}`)
  }
}
