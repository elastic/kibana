/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import type { SavedObjectsExportTransformContext } from '../../../../../src/core/server/saved_objects/export/types';
import type { SavedObjectsTypeMappingDefinition } from '../../../../../src/core/server/saved_objects/mappings/types';
import type { SavedObjectsServiceSetup } from '../../../../../src/core/server/saved_objects/saved_objects_service';
import type { SavedObject } from '../../../../../src/core/types/saved_objects';
import type { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server/plugin';
import { RuleTypeRegistry } from '../rule_type_registry';
import type { RawAlert } from '../types';
import { getImportWarnings } from './get_import_warnings';
import { isRuleExportable } from './is_rule_exportable';
import mappings from './mappings.json';
import { getMigrations } from './migrations';
import { transformRulesForExport } from './transform_rule_for_export';

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
  ruleTypeRegistry: RuleTypeRegistry,
  logger: Logger
) {
  savedObjects.registerType({
    name: 'alert',
    hidden: true,
    namespaceType: 'single',
    migrations: getMigrations(encryptedSavedObjects),
    mappings: mappings.alert as SavedObjectsTypeMappingDefinition,
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
      isExportable<RawAlert>(ruleSavedObject: SavedObject<RawAlert>) {
        return isRuleExportable(ruleSavedObject, ruleTypeRegistry, logger);
      },
    },
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
}
