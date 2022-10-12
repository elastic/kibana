/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gte } from 'semver';
import {
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
} from '@kbn/core/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { MigrateFunctionsObject, MigrateFunction } from '@kbn/kibana-utils-plugin/common';
import { mergeSavedObjectMigrationMaps } from '@kbn/core/server';
import { isSerializedSearchSource, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { RawRule } from '../../types';
import { getMigrations_7_10_0 } from './7.10';
import { getMigrations_7_11_0, getMigrations_7_11_2 } from './7.11';
import { getMigrations_7_13_0 } from './7.13';
import { getMigrations_7_14_0 } from './7.14';
import { getMigrations_7_15_0 } from './7.15';
import { getMigrations_7_16_0 } from './7.16';
import { getMigrations_8_0_0, getMigrations_8_0_1 } from './8.0';
import { getMigrations_8_2_0 } from './8.2';
import { getMigrations_8_3_0 } from './8.3';
import { getMigrations_8_4_1 } from './8.4';
import { getMigrations_8_5_0 } from './8.5';
import { AlertLogMeta, AlertMigration } from './types';
import { MINIMUM_SS_MIGRATION_VERSION } from './constants';
import { createEsoMigration, isEsQueryRuleType, pipeMigrations } from './utils';


export function getMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  searchSourceMigrations: MigrateFunctionsObject,
  isPreconfigured: (connectorId: string) => boolean
): SavedObjectMigrationMap {
  return mergeSavedObjectMigrationMaps(
    {
      '7.10.0': executeMigrationWithErrorHandling(getMigrations_7_10_0(encryptedSavedObjects), '7.10.0'),
      '7.11.0': executeMigrationWithErrorHandling(getMigrations_7_11_0(encryptedSavedObjects), '7.11.0'),
      '7.11.2': executeMigrationWithErrorHandling(getMigrations_7_11_2(encryptedSavedObjects), '7.11.2'),
      '7.13.0': executeMigrationWithErrorHandling(getMigrations_7_13_0(encryptedSavedObjects), '7.13.0'),
      '7.14.1': executeMigrationWithErrorHandling(getMigrations_7_14_0(encryptedSavedObjects), '7.14.1'),
      '7.15.0': executeMigrationWithErrorHandling(getMigrations_7_15_0(encryptedSavedObjects), '7.15.0'),
      '7.16.0': executeMigrationWithErrorHandling(getMigrations_7_16_0(encryptedSavedObjects, isPreconfigured), '7.16.0'),
      '8.0.0': executeMigrationWithErrorHandling(getMigrations_8_0_0(encryptedSavedObjects), '8.0.0'),
      '8.0.1': executeMigrationWithErrorHandling(getMigrations_8_0_1(encryptedSavedObjects), '8.0.1'),
      '8.2.0': executeMigrationWithErrorHandling(getMigrations_8_2_0(encryptedSavedObjects), '8.2.0'),
      '8.3.0': executeMigrationWithErrorHandling(getMigrations_8_3_0(encryptedSavedObjects), '8.3.0'),
      '8.4.1': executeMigrationWithErrorHandling(getMigrations_8_4_1(encryptedSavedObjects), '8.4.1'),
      '8.5.0': executeMigrationWithErrorHandling(getMigrations_8_5_0(encryptedSavedObjects), '8.5.0'),
    },
    getSearchSourceMigrations(encryptedSavedObjects, searchSourceMigrations)
  );
}

function executeMigrationWithErrorHandling(
  migrationFunc: SavedObjectMigrationFn<RawRule, RawRule>,
  version: string
) {
  return (doc: SavedObjectUnsanitizedDoc<RawRule>, context: SavedObjectMigrationContext) => {
    try {
      return migrationFunc(doc, context);
    } catch (ex) {
      context.log.error<AlertLogMeta>(
        `encryptedSavedObject ${version} migration failed for alert ${doc.id} with error: ${ex.message}`,
        {
          migrations: {
            alertDocument: doc,
          },
        }
      );
      throw ex;
    }
  };
}

function mapSearchSourceMigrationFunc(
  migrateSerializedSearchSourceFields: MigrateFunction<SerializedSearchSourceFields>
): MigrateFunction {
  return (doc) => {
    const _doc = doc as { attributes: RawRule };

    const serializedSearchSource = _doc.attributes.params.searchConfiguration;

    if (isSerializedSearchSource(serializedSearchSource)) {
      return {
        ..._doc,
        attributes: {
          ..._doc.attributes,
          params: {
            ..._doc.attributes.params,
            searchConfiguration: migrateSerializedSearchSourceFields(serializedSearchSource),
          },
        },
      };
    }
    return _doc;
  };
}

/**
 * This creates a migration map that applies search source migrations to legacy es query rules.
 * It doesn't modify existing migrations. The following migrations will occur at minimum version of 8.3+.
 */
function getSearchSourceMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  searchSourceMigrations: MigrateFunctionsObject
) {
  const filteredMigrations: SavedObjectMigrationMap = {};
  for (const versionKey in searchSourceMigrations) {
    if (gte(versionKey, MINIMUM_SS_MIGRATION_VERSION)) {
      const migrateSearchSource = mapSearchSourceMigrationFunc(
        searchSourceMigrations[versionKey]
      ) as unknown as AlertMigration;

      filteredMigrations[versionKey] = executeMigrationWithErrorHandling(
        createEsoMigration(
          encryptedSavedObjects,
          (doc: SavedObjectUnsanitizedDoc<RawRule>): doc is SavedObjectUnsanitizedDoc<RawRule> =>
            isEsQueryRuleType(doc),
          pipeMigrations(migrateSearchSource)
        ),
        versionKey
      );
    }
  }
  return filteredMigrations;
}

