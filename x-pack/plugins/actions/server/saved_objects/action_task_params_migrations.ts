/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogMeta,
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
  SavedObjectReference,
} from '../../../../../src/core/server';
import { ActionTaskParams } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
import type { IsMigrationNeededPredicate } from '../../../encrypted_saved_objects/server';
import { RelatedSavedObjectRef, RelatedSavedObjects } from '../lib/related_saved_objects';

interface ActionTaskParamsLogMeta extends LogMeta {
  migrations: { actionTaskParamDocument: SavedObjectUnsanitizedDoc<ActionTaskParams> };
}

type ActionTaskParamMigration = (
  doc: SavedObjectUnsanitizedDoc<ActionTaskParams>
) => SavedObjectUnsanitizedDoc<ActionTaskParams>;

function createEsoMigration(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  isMigrationNeededPredicate: IsMigrationNeededPredicate<ActionTaskParams, ActionTaskParams>,
  migrationFunc: ActionTaskParamMigration
) {
  return encryptedSavedObjects.createMigration<ActionTaskParams, ActionTaskParams>({
    isMigrationNeededPredicate,
    migration: migrationFunc,
    shouldMigrateIfDecryptionFails: true, // shouldMigrateIfDecryptionFails flag that applies the migration to undecrypted document if decryption fails
  });
}

export function getActionTaskParamsMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationMap {
  const migrationActionTaskParamsSixteen = createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<ActionTaskParams> => true,
    pipeMigrations(useSavedObjectReferences)
  );

  return {
    '7.16.0': executeMigrationWithErrorHandling(migrationActionTaskParamsSixteen, '7.16.0'),
  };
}

function executeMigrationWithErrorHandling(
  migrationFunc: SavedObjectMigrationFn<ActionTaskParams, ActionTaskParams>,
  version: string
) {
  return (
    doc: SavedObjectUnsanitizedDoc<ActionTaskParams>,
    context: SavedObjectMigrationContext
  ) => {
    try {
      return migrationFunc(doc, context);
    } catch (ex) {
      context.log.error<ActionTaskParamsLogMeta>(
        `encryptedSavedObject ${version} migration failed for action task param ${doc.id} with error: ${ex.message}`,
        {
          migrations: {
            actionTaskParamDocument: doc,
          },
        }
      );
      throw ex;
    }
  };
}

function useSavedObjectReferences(
  doc: SavedObjectUnsanitizedDoc<ActionTaskParams>
): SavedObjectUnsanitizedDoc<ActionTaskParams> {
  const {
    attributes: { actionId, relatedSavedObjects },
    references,
  } = doc;

  const newReferences: SavedObjectReference[] = [];
  const relatedSavedObjectRefs: RelatedSavedObjectRef[] = [];

  // No way to differentiate preconfigured from non-preconfigured action here
  newReferences.push({
    id: actionId,
    name: 'actionRef',
    type: 'action',
  });

  // Add related saved objects, if any
  ((relatedSavedObjects as RelatedSavedObjects) ?? []).forEach((relatedSavedObject, index) => {
    const { id, ...restRelatedSavedObject } = relatedSavedObject;
    relatedSavedObjectRefs.push({
      ...restRelatedSavedObject,
      ref: `related_${relatedSavedObject.type}_${index}`,
    });
    newReferences.push({
      id: relatedSavedObject.id,
      name: `related_${relatedSavedObject.type}_${index}`,
      type: relatedSavedObject.type,
    });
  });

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      actionId: 'actionRef',
    },
    references: [...(references ?? []), ...(newReferences ?? [])],
  };
}

function pipeMigrations(...migrations: ActionTaskParamMigration[]): ActionTaskParamMigration {
  return (doc: SavedObjectUnsanitizedDoc<ActionTaskParams>) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc), doc);
}
