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

// Remove this when we finish updating terminology in the code
type RawConnector = RawAction;

interface ConnectorLogMeta extends LogMeta {
  migrations: { connectorDocument: SavedObjectUnsanitizedDoc<RawConnector> };
}

type ConnectorMigration = (
  doc: SavedObjectUnsanitizedDoc<RawConnector>
) => SavedObjectUnsanitizedDoc<RawConnector>;

type IsMigrationNeededPredicate<InputAttributes> = (
  doc: SavedObjectUnsanitizedDoc<InputAttributes>
) => doc is SavedObjectUnsanitizedDoc<InputAttributes>;

interface ConnectorMigrationFns<InputAttributes, MigratedAttributes> {
  esoMigrationFn: SavedObjectMigrationFn<InputAttributes, MigratedAttributes>;
  fallbackMigrationFn: SavedObjectMigrationFn<InputAttributes, MigratedAttributes>;
}

export function getMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationMap {
  const migrationActionsTen = createMigrationFns(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawConnector> =>
      doc.attributes.config?.hasOwnProperty('casesConfiguration') ||
      doc.attributes.actionTypeId === '.email',
    pipeMigrations(renameCasesConfigurationObject, addHasAuthConfigurationObject)
  );

  const migrationActionsEleven = createMigrationFns(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawConnector> =>
      doc.attributes.config?.hasOwnProperty('isCaseOwned') ||
      doc.attributes.config?.hasOwnProperty('incidentConfiguration') ||
      doc.attributes.actionTypeId === '.webhook',
    pipeMigrations(removeCasesFieldMappings, addHasAuthConfigurationObject)
  );

  const migrationActionsFourteen = createMigrationFns(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawConnector> => true,
    pipeMigrations(addisMissingSecretsField)
  );

  return {
    '7.10.0': executeMigrationWithErrorHandling(migrationActionsTen, '7.10.0'),
    '7.11.0': executeMigrationWithErrorHandling(migrationActionsEleven, '7.11.0'),
    '7.14.0': executeMigrationWithErrorHandling(migrationActionsFourteen, '7.14.0'),
  };
}

function executeMigrationWithErrorHandling(
  migrationFunctions: ConnectorMigrationFns<RawConnector, RawConnector>,
  version: string
) {
  return (doc: SavedObjectUnsanitizedDoc<RawConnector>, context: SavedObjectMigrationContext) => {
    try {
      return migrationFunctions.esoMigrationFn(doc, context);
    } catch (ex) {
      context.log.error<ConnectorLogMeta>(
        `encryptedSavedObject ${version} migration failed for action ${doc.id} with error: ${ex.message}`,
        {
          migrations: {
            connectorDocument: doc,
          },
        }
      );
    }
    return migrationFunctions.fallbackMigrationFn(doc, context);
  };
}

function renameCasesConfigurationObject(
  doc: SavedObjectUnsanitizedDoc<RawConnector>
): SavedObjectUnsanitizedDoc<RawConnector> {
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
  doc: SavedObjectUnsanitizedDoc<RawConnector>
): SavedObjectUnsanitizedDoc<RawConnector> {
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
  doc: SavedObjectUnsanitizedDoc<RawConnector>
): SavedObjectUnsanitizedDoc<RawConnector> => {
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
  doc: SavedObjectUnsanitizedDoc<RawConnector>
): SavedObjectUnsanitizedDoc<RawConnector> => {
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      isMissingSecrets: false,
    },
  };
};

function pipeMigrations(...migrations: ConnectorMigration[]): ConnectorMigration {
  return (doc: SavedObjectUnsanitizedDoc<RawConnector>) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc), doc);
}

function createMigrationFns(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  isMigrationNeededPredicate: IsMigrationNeededPredicate<RawConnector>,
  migrationFunc: ConnectorMigration
): ConnectorMigrationFns<RawConnector, RawConnector> {
  return {
    esoMigrationFn: encryptedSavedObjects.createMigration<RawConnector, RawConnector>(
      isMigrationNeededPredicate,
      migrationFunc
    ),
    fallbackMigrationFn: (doc: SavedObjectUnsanitizedDoc<RawConnector>) => {
      if (!isMigrationNeededPredicate(doc)) {
        return doc;
      }

      return migrationFunc(doc);
    },
  };
}
