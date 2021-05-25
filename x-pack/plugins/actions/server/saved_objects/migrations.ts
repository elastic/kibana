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
} from '../../../../../src/core/server';
import { RawAction } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

interface ActionsLogMeta extends LogMeta {
  migrations: { actionDocument: SavedObjectUnsanitizedDoc<RawAction> };
}

type ActionMigration = (
  doc: SavedObjectUnsanitizedDoc<RawAction>
) => SavedObjectUnsanitizedDoc<RawAction>;

export function getMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationMap {
  const migrationActionsTen = encryptedSavedObjects.createMigration<RawAction, RawAction>(
    (doc): doc is SavedObjectUnsanitizedDoc<RawAction> =>
      doc.attributes.config?.hasOwnProperty('casesConfiguration') ||
      doc.attributes.actionTypeId === '.email',
    pipeMigrations(renameCasesConfigurationObject, addHasAuthConfigurationObject)
  );

  const migrationActionsEleven = encryptedSavedObjects.createMigration<RawAction, RawAction>(
    (doc): doc is SavedObjectUnsanitizedDoc<RawAction> =>
      doc.attributes.config?.hasOwnProperty('isCaseOwned') ||
      doc.attributes.config?.hasOwnProperty('incidentConfiguration') ||
      doc.attributes.actionTypeId === '.webhook',
    pipeMigrations(removeCasesFieldMappings, addHasAuthConfigurationObject)
  );

  const migrationActionsFourteen = encryptedSavedObjects.createMigration<RawAction, RawAction>(
    (doc): doc is SavedObjectUnsanitizedDoc<RawAction> => true,
    pipeMigrations(addisMissingSecretsField)
  );

  return {
    '7.10.0': executeMigrationWithErrorHandling(migrationActionsTen, '7.10.0'),
    '7.11.0': executeMigrationWithErrorHandling(migrationActionsEleven, '7.11.0'),
    '7.14.0': executeMigrationWithErrorHandling(migrationActionsFourteen, '7.14.0'),
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
      context.log.error<ActionsLogMeta>(
        `encryptedSavedObject ${version} migration failed for action ${doc.id} with error: ${ex.message}`,
        {
          migrations: {
            actionDocument: doc,
          },
        }
      );
    }
    return doc;
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

function pipeMigrations(...migrations: ActionMigration[]): ActionMigration {
  return (doc: SavedObjectUnsanitizedDoc<RawAction>) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc), doc);
}
