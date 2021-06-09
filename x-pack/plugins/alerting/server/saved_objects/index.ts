/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectsExportTransformContext,
  SavedObjectsServiceSetup,
  SavedObjectsTypeMappingDefinition,
} from 'kibana/server';
import mappings from './mappings.json';
import { getMigrations } from './migrations';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
import { transformRulesForExport } from './transform_rule_for_export';
import { RawAlert } from '../types';
import { getImportWarnings } from './get_import_warnings';
import { AlertsConfig } from '../config';
export { partiallyUpdateAlert } from './partially_update_alert';

export const AlertAttributesExcludedFromAAD = [
  'scheduledTaskId',
  'muteAll',
  'mutedInstanceIds',
  'updatedBy',
  'updatedAt',
  'executionStatus',
];

// useful for Pick<RawAlert, AlertAttributesExcludedFromAADType> which is a
// type which is a subset of RawAlert with just attributes excluded from AAD

// useful for Pick<RawAlert, AlertAttributesExcludedFromAADType>
export type AlertAttributesExcludedFromAADType =
  | 'scheduledTaskId'
  | 'muteAll'
  | 'mutedInstanceIds'
  | 'updatedBy'
  | 'updatedAt'
  | 'executionStatus';

export function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  alertingConfig: Promise<AlertsConfig>
) {
  alertingConfig.then((config: AlertsConfig) => {
    savedObjects.registerType({
      name: 'alert',
      hidden: true,
      namespaceType: 'single',
      migrations: getMigrations(encryptedSavedObjects),
      mappings: mappings.alert as SavedObjectsTypeMappingDefinition,
      ...(config.enableImportExport
        ? {
            management: {
              importableAndExportable: true,
              getTitle(ruleSavedObject: SavedObject<RawAlert>) {
                return `Rule: [${ruleSavedObject.attributes.name}]`;
              },
              onImport(ruleSavedObjects) {
                return {
                  warnings: getImportWarnings(ruleSavedObjects),
                };
              },
              onExport<RawAlert>(
                context: SavedObjectsExportTransformContext,
                objects: Array<SavedObject<RawAlert>>
              ) {
                return transformRulesForExport(objects);
              },
            },
          }
        : {}),
    });

    savedObjects.registerType({
      name: 'api_key_pending_invalidation',
      hidden: true,
      namespaceType: 'agnostic',
      mappings: {
        properties: {
          apiKeyId: {
            type: 'keyword',
          },
          createdAt: {
            type: 'date',
          },
        },
      },
    });

    // Encrypted attributes
    encryptedSavedObjects.registerType({
      type: 'alert',
      attributesToEncrypt: new Set(['apiKey']),
      attributesToExcludeFromAAD: new Set(AlertAttributesExcludedFromAAD),
    });

    // Encrypted attributes
    encryptedSavedObjects.registerType({
      type: 'api_key_pending_invalidation',
      attributesToEncrypt: new Set(['apiKeyId']),
    });
  });
}
