/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SavedObject,
  SavedObjectsExportTransformContext,
  SavedObjectsServiceSetup,
} from '@kbn/core/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { alertMappings } from '../../common/saved_objects/rules/mappings';
import { rulesSettingsMappings } from './rules_settings_mappings';
import { maintenanceWindowMappings } from './maintenance_window_mapping';
import { getMigrations } from './migrations';
import { transformRulesForExport } from './transform_rule_for_export';
import { RawRule } from '../types';
import { getImportWarnings } from './get_import_warnings';
import { isRuleExportable } from './is_rule_exportable';
import { RuleTypeRegistry } from '../rule_type_registry';
export { partiallyUpdateAlert } from './partially_update_alert';
export { getLatestRuleVersion, getMinimumCompatibleVersion } from './rule_model_versions';
import {
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../common';
import { ruleModelVersions } from './rule_model_versions';

// Use caution when removing items from this array! Any field which has
// ever existed in the rule SO must be included in this array to prevent
// decryption failures during migration.
export const AlertAttributesExcludedFromAAD = [
  'scheduledTaskId',
  'muteAll',
  'mutedInstanceIds',
  'updatedBy',
  'updatedAt',
  'executionStatus',
  'monitoring',
  'snoozeEndTime', // field removed in 8.2, but must be retained in case an rule created/updated in 8.2 is being migrated
  'snoozeSchedule',
  'isSnoozedUntil',
  'lastRun',
  'nextRun',
  'revision',
  'running',
];

// properties: {
//     enabled: {
//     name: {
//     tags: {
//     alertTypeId: {
//     schedule: {
//     consumer: {
//     legacyId: {
//     actions: {
//     params: {
//     mapped_params: {
//     scheduledTaskId: {
//     createdBy: {
//     updatedBy: {
//     createdAt: {
//     updatedAt: {
//     // NEED TO CHECK WITH KIBANA SECURITY
//     // apiKey: {
//     //   type: 'binary',
//     // },
//     // NO NEED TO BE INDEXED
//     // apiKeyOwner: {
//     //   type: 'keyword',
//     // },
//     throttle: {
//     notifyWhen: {
//     muteAll: {
//     mutedInstanceIds: {
//     // meta: {
//     monitoring: {
//     revision: {
//     snoozeSchedule: {
//     nextRun: {
//     executionStatus: {
//     lastRun: {
//     running: {
//       type: 'boolean',
//     },
//   },

export const AlertAttributesIncludedInAAD = [
  // include enabled: boolean;
  'enabled',
  // include name: string;
  'name',
  // include tags: string[];
  'tags',
  // include alertTypeId: string; // this cannot be renamed since it is in the saved object
  'alertTypeId',
  // include consumer: string;
  'consumer',
  // include legacyId: string | null;
  'legacyId',
  // include schedule: IntervalSchedule;
  'schedule',
  // include actions: RawRuleAction[];
  'actions',
  // include params: SavedObjectAttributes;
  'params',
  // include mapped_params?: MappedParams;
  'mapped_params',
  // exclude scheduledTaskId?: string | null;
  // include createdBy: string | null;
  'createdBy',
  // exclude updatedBy: string | null;
  // include createdAt: string;
  'createdAt',
  // exclude updatedAt: string;
  // include apiKey: string | null;
  'apiKey',
  // include apiKeyOwner: string | null;
  'apiKeyOwner',
  // include apiKeyCreatedByUser?: boolean | null;
  'apiKeyCreatedByUser',
  // include throttle?: string | null;
  'throttle',
  // include notifyWhen?: RuleNotifyWhenType | null;
  'notifyWhen',
  // exclude muteAll: boolean;
  // exclude mutedInstanceIds: string[];
  // include meta?: RuleMeta;
  'meta',
  // exclude executionStatus: RawRuleExecutionStatus;
  // exclude monitoring?: RawRuleMonitoring;
  // exclude snoozeSchedule?: RuleSnooze; // Remove ? when this parameter is made available in the public API
  // exclude isSnoozedUntil?: string | null;
  // exclude lastRun?: RawRuleLastRun | null;
  // exclude nextRun?: string | null;
  // exclude revision: number;
  // exclude running?: boolean | null;
  // exclude (**no longer a field**) snoozeEndTime
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
  | 'executionStatus'
  | 'monitoring'
  | 'snoozeEndTime'
  | 'snoozeSchedule'
  | 'isSnoozedUntil'
  | 'lastRun'
  | 'nextRun'
  | 'revision'
  | 'running';

export function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  ruleTypeRegistry: RuleTypeRegistry,
  logger: Logger,
  isPreconfigured: (connectorId: string) => boolean,
  getSearchSourceMigrations: () => MigrateFunctionsObject
) {
  savedObjects.registerType({
    name: 'alert',
    indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
    hidden: true,
    namespaceType: 'multiple-isolated',
    convertToMultiNamespaceTypeVersion: '8.0.0',
    migrations: getMigrations(encryptedSavedObjects, getSearchSourceMigrations(), isPreconfigured),
    mappings: alertMappings,
    management: {
      displayName: 'rule',
      importableAndExportable: true,
      getTitle(ruleSavedObject: SavedObject<RawRule>) {
        return `Rule: [${ruleSavedObject.attributes.name}]`;
      },
      onImport(ruleSavedObjects) {
        return {
          warnings: getImportWarnings(ruleSavedObjects),
        };
      },
      onExport<RawRule>(
        context: SavedObjectsExportTransformContext,
        objects: Array<SavedObject<RawRule>>
      ) {
        return transformRulesForExport(objects);
      },
      isExportable<RawRule>(ruleSavedObject: SavedObject<RawRule>) {
        return isRuleExportable(ruleSavedObject, ruleTypeRegistry, logger);
      },
    },
    modelVersions: ruleModelVersions,
  });

  savedObjects.registerType({
    name: 'api_key_pending_invalidation',
    indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
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

  savedObjects.registerType({
    name: RULES_SETTINGS_SAVED_OBJECT_TYPE,
    indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
    hidden: true,
    namespaceType: 'single',
    mappings: rulesSettingsMappings,
  });

  savedObjects.registerType({
    name: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
    hidden: true,
    namespaceType: 'multiple-isolated',
    mappings: maintenanceWindowMappings,
  });

  // Encrypted attributes
  encryptedSavedObjects.registerType({
    type: 'alert',
    attributesToEncrypt: new Set(['apiKey']),
    // attributesToExcludeFromAAD: new Set(AlertAttributesExcludedFromAAD),
    attributesToIncludeInAAD: new Set(AlertAttributesIncludedInAAD),
  });

  // Encrypted attributes
  encryptedSavedObjects.registerType({
    type: 'api_key_pending_invalidation',
    attributesToEncrypt: new Set(['apiKeyId']),
    attributesToIncludeInAAD: new Set('createdAt'),
  });
}
