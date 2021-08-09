/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import {
  LogMeta,
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
  SavedObjectsUtils,
} from '../../../../../src/core/server';
import { ActionTaskParams, RawAction } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
import type { IsMigrationNeededPredicate } from '../../../encrypted_saved_objects/server';
import { RelatedSavedObjects } from '../lib/related_saved_objects';

interface ActionsLogMeta<T = RawAction> extends LogMeta {
  migrations: { actionDocument: SavedObjectUnsanitizedDoc<T> };
}

type ActionMigration<T = RawAction> = (
  doc: SavedObjectUnsanitizedDoc<T>
) => SavedObjectUnsanitizedDoc<T>;

function createEsoMigration<T = RawAction>(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  isMigrationNeededPredicate: IsMigrationNeededPredicate<T, T>,
  migrationFunc: ActionMigration<T>
) {
  return encryptedSavedObjects.createMigration<T, T>({
    isMigrationNeededPredicate,
    migration: migrationFunc,
    shouldMigrateIfDecryptionFails: true, // shouldMigrateIfDecryptionFails flag that applies the migration to undecrypted document if decryption fails
  });
}

export function getActionTaskParamsMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationMap {
  const migrationResolveSavedObjectsIdsInActionTaskParams = createEsoMigration<ActionTaskParams>(
    encryptedSavedObjects,
    (
      doc: SavedObjectUnsanitizedDoc<ActionTaskParams>
    ): doc is SavedObjectUnsanitizedDoc<ActionTaskParams> => {
      return doc.type === 'action_task_params';
    },
    pipeMigrations(resolveSavedObjectIdsInActionTaskParams)
  );

  const migrationActionsMoveRelatedSavedObjects = createEsoMigration(
    encryptedSavedObjects,
    (
      doc: SavedObjectUnsanitizedDoc<ActionTaskParams>
    ): doc is SavedObjectUnsanitizedDoc<ActionTaskParams> => {
      return doc.type === 'action_task_params';
    },
    pipeMigrations(moveRelatedSavedObjects)
  );

  return {
    // '7.15.0': executeMigrationWithErrorHandling(migrationActionsMoveRelatedSavedObjects, '7.15.0'),
    '8.0.0': executeMigrationWithErrorHandling(
      migrationResolveSavedObjectsIdsInActionTaskParams,
      '8.0.0'
    ),
  };
}

export function getMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationMap {
  const migrationActionsTen = createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawAction> =>
      doc.attributes.config?.hasOwnProperty('casesConfiguration') ||
      doc.attributes.actionTypeId === '.email',
    pipeMigrations(renameCasesConfigurationObject, addHasAuthConfigurationObject)
  );

  const migrationActionsEleven = createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawAction> =>
      doc.attributes.config?.hasOwnProperty('isCaseOwned') ||
      doc.attributes.config?.hasOwnProperty('incidentConfiguration') ||
      doc.attributes.actionTypeId === '.webhook',
    pipeMigrations(removeCasesFieldMappings, addHasAuthConfigurationObject)
  );

  const migrationActionsFourteen = createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawAction> => true,
    pipeMigrations(addisMissingSecretsField)
  );

  // This empty migration is necessary to ensure that the saved object is decrypted with its old descriptor/ and re-encrypted with its new
  // descriptor, if necessary. This is included because the saved object is being converted to `namespaceType: 'multiple-isolated'` in 8.0
  // (see the `convertToMultiNamespaceTypeVersion` field in the saved object type registration process).
  const migrationActions800 = createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawAction>): doc is SavedObjectUnsanitizedDoc<RawAction> =>
      true,
    (doc) => doc // no-op
  );

  return {
    '7.10.0': executeMigrationWithErrorHandling(migrationActionsTen, '7.10.0'),
    '7.11.0': executeMigrationWithErrorHandling(migrationActionsEleven, '7.11.0'),
    '7.14.0': executeMigrationWithErrorHandling(migrationActionsFourteen, '7.14.0'),
    '8.0.0': executeMigrationWithErrorHandling(migrationActions800, '8.0.0'),
  };
}

function executeMigrationWithErrorHandling<T = RawAction>(
  migrationFunc: SavedObjectMigrationFn<T, T>,
  version: string
) {
  return (doc: SavedObjectUnsanitizedDoc<T>, context: SavedObjectMigrationContext) => {
    try {
      return migrationFunc(doc, context);
    } catch (ex) {
      context.log.error<ActionsLogMeta<T>>(
        `encryptedSavedObject ${version} migration failed for action ${doc.id} with error: ${ex.message}`,
        {
          migrations: {
            actionDocument: doc,
          },
        }
      );
      throw ex;
    }
  };
}

function renameCasesConfigurationObject(
  doc: SavedObjectUnsanitizedDoc<RawAction>
): SavedObjectUnsanitizedDoc<RawAction> {
  if (!doc.attributes.config?.casesConfiguration) {
    return doc;
  }
  const { casesConfiguration, ...restConfiguration } = doc.attributes.config;

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      config: {
        ...restConfiguration,
        incidentConfiguration: casesConfiguration,
      },
    },
  };
}

function removeCasesFieldMappings(
  doc: SavedObjectUnsanitizedDoc<RawAction>
): SavedObjectUnsanitizedDoc<RawAction> {
  if (
    !doc.attributes.config?.hasOwnProperty('isCaseOwned') &&
    !doc.attributes.config?.hasOwnProperty('incidentConfiguration')
  ) {
    return doc;
  }
  const { incidentConfiguration, isCaseOwned, ...restConfiguration } = doc.attributes.config;

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      config: restConfiguration,
    },
  };
}

const addHasAuthConfigurationObject = (
  doc: SavedObjectUnsanitizedDoc<RawAction>
): SavedObjectUnsanitizedDoc<RawAction> => {
  if (doc.attributes.actionTypeId !== '.email' && doc.attributes.actionTypeId !== '.webhook') {
    return doc;
  }
  const hasAuth = !!doc.attributes.secrets?.user || !!doc.attributes.secrets?.password;
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
};

const addisMissingSecretsField = (
  doc: SavedObjectUnsanitizedDoc<RawAction>
): SavedObjectUnsanitizedDoc<RawAction> => {
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      isMissingSecrets: false,
    },
  };
};

const moveRelatedSavedObjects = (
  doc: SavedObjectUnsanitizedDoc<ActionTaskParams>
): SavedObjectUnsanitizedDoc<ActionTaskParams> => {
  const relatedSavedObjects = (doc.attributes
    .relatedSavedObjects as unknown) as RelatedSavedObjects[];
  if (relatedSavedObjects) {
    const references = doc.references ?? [];
    references.push(
      ...relatedSavedObjects.map((relatedSavedObject) => ({
        name: relatedSavedObject.typeId ?? 'unknown',
        type: relatedSavedObject.type,
        id: relatedSavedObject.id,
      }))
    );
    return {
      ...doc,
      references,
      attributes: omit(doc.attributes, ['relatedSavedObjects']),
    };
  }
  return doc;
};

const resolveSavedObjectIdsInActionTaskParams = (
  doc: SavedObjectUnsanitizedDoc<ActionTaskParams>
): SavedObjectUnsanitizedDoc<ActionTaskParams> => {
  const namespace = doc.namespaces && doc.namespaces.length ? doc.namespaces[0] : undefined;
  const newId =
    namespace && namespace !== 'default'
      ? SavedObjectsUtils.getConvertedObjectId(namespace, 'action', doc.attributes.actionId)
      : doc.attributes.actionId;
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      actionId: newId,
    },
  };
};

function pipeMigrations<T = RawAction>(
  ...migrations: Array<ActionMigration<T>>
): ActionMigration<T> {
  return (doc: SavedObjectUnsanitizedDoc<T>) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc), doc);
}
