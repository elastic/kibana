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
import type { IsMigrationNeededPredicate } from '../../../encrypted_saved_objects/server';

interface ActionsLogMeta extends LogMeta {
  migrations: { actionDocument: SavedObjectUnsanitizedDoc<RawAction> };
}

type ActionMigration = (
  doc: SavedObjectUnsanitizedDoc<RawAction>
) => SavedObjectUnsanitizedDoc<RawAction>;

function createEsoMigration(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  isMigrationNeededPredicate: IsMigrationNeededPredicate<RawAction, RawAction>,
  migrationFunc: ActionMigration
) {
  return encryptedSavedObjects.createMigration<RawAction, RawAction>({
    isMigrationNeededPredicate,
    migration: migrationFunc,
    shouldMigrateIfDecryptionFails: true, // shouldMigrateIfDecryptionFails flag that applies the migration to undecrypted document if decryption fails
  });
}

export function getActionsMigrations(
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
    pipeMigrations(addIsMissingSecretsField)
  );

  const migrationActionsSixteen = createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawAction> =>
      doc.attributes.actionTypeId === '.servicenow' ||
      doc.attributes.actionTypeId === '.servicenow-sir' ||
      doc.attributes.actionTypeId === '.email',
    pipeMigrations(addUsesTableApiToServiceNowConnectors, setServiceConfigIfNotSet)
  );

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
    '7.16.0': executeMigrationWithErrorHandling(migrationActionsSixteen, '7.16.0'),
    '8.0.0': executeMigrationWithErrorHandling(migrationActions800, '8.0.0'),
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

const setServiceConfigIfNotSet = (
  doc: SavedObjectUnsanitizedDoc<RawAction>
): SavedObjectUnsanitizedDoc<RawAction> => {
  if (doc.attributes.actionTypeId !== '.email' || null != doc.attributes.config.service) {
    return doc;
  }
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      config: {
        ...doc.attributes.config,
        service: 'other',
      },
    },
  };
};

const addIsMissingSecretsField = (
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

const addUsesTableApiToServiceNowConnectors = (
  doc: SavedObjectUnsanitizedDoc<RawAction>
): SavedObjectUnsanitizedDoc<RawAction> => {
  if (
    doc.attributes.actionTypeId !== '.servicenow' &&
    doc.attributes.actionTypeId !== '.servicenow-sir'
  ) {
    return doc;
  }

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      config: {
        ...doc.attributes.config,
        usesTableApi: true,
      },
    },
  };
};

function pipeMigrations(...migrations: ActionMigration[]): ActionMigration {
  return (doc: SavedObjectUnsanitizedDoc<RawAction>) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc), doc);
}
