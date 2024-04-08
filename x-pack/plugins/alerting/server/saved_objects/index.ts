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
export { partiallyUpdateRule } from './partially_update_rule';
export { getLatestRuleVersion, getMinimumCompatibleVersion } from './rule_model_versions';
import {
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../common';
import { ruleModelVersions } from './rule_model_versions';
import { adHocRunParamsModelVersions } from './ad_hoc_run_params_model_versions';

export const RULE_SAVED_OBJECT_TYPE = 'alert';
export const AD_HOC_RUN_SAVED_OBJECT_TYPE = 'ad_hoc_run_params';

export const RuleAttributesToEncrypt = ['apiKey'];

// Use caution when removing items from this array! These fields
// are used to construct decryption AAD and must be remain in
// this array to prevent decryption failures during migration.
// NOTE: Always update the RuleAttributesNotPartiallyUpdatable
// type if this const changes!
export const RuleAttributesIncludedInAAD = [
  'enabled',
  'name',
  'tags',
  'alertTypeId',
  'consumer',
  'legacyId',
  'schedule',
  'actions',
  'params',
  'mapped_params',
  'createdBy',
  'createdAt',
  'apiKeyOwner',
  'apiKeyCreatedByUser',
  'throttle',
  'notifyWhen',
  'meta',
  'alertDelay',
];

// useful type for Omit<RuleAttributes, [...RuleAttributesToEncrypt, ...RuleAttributesIncludedInAAD]>
// which will produce a subset of RuleAttributes with just attributes that are safe to partually
// update from AAD
export type RuleAttributesNotPartiallyUpdatable =
  | 'apiKey'
  | 'enabled'
  | 'name'
  | 'tags'
  | 'alertTypeId'
  | 'consumer'
  | 'legacyId'
  | 'schedule'
  | 'actions'
  | 'params'
  | 'mapped_params'
  | 'createdBy'
  | 'createdAt'
  | 'apiKeyOwner'
  | 'apiKeyCreatedByUser'
  | 'throttle'
  | 'notifyWhen'
  | 'meta'
  | 'alertDelay';

export const AdHocRunAttributesToEncrypt = ['apiKeyToUse'];
export const AdHocRunAttributesIncludedInAAD = [
  'enabled',
  'start',
  'duration',
  'createdAt',
  'rule',
  'spaceId',
];
export type AdHocRunAttributesNotPartiallyUpdatable =
  | 'enabled'
  | 'start'
  | 'duration'
  | 'createdAt'
  | 'rule'
  | 'spaceId'
  | 'apiKeyToUse';

export function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  ruleTypeRegistry: RuleTypeRegistry,
  logger: Logger,
  isPreconfigured: (connectorId: string) => boolean,
  getSearchSourceMigrations: () => MigrateFunctionsObject
) {
  savedObjects.registerType({
    name: RULE_SAVED_OBJECT_TYPE,
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

  savedObjects.registerType({
    name: AD_HOC_RUN_SAVED_OBJECT_TYPE,
    indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
    hidden: true,
    namespaceType: 'multiple-isolated',
    mappings: {
      dynamic: false,
      properties: {
        // shape is defined in x-pack/plugins/alerting/server/data/ad_hoc_run/types/ad_hoc_run.ts
        // TODO to allow invalidate api key task to query for backfill jobs still
        // using the API key
        // apiKeyId: {
        //   type: 'keyword'
        // },
        createdAt: {
          type: 'date',
        },
        end: {
          type: 'date',
        },
        rule: {
          properties: {
            alertTypeId: {
              type: 'keyword',
            },
            consumer: {
              type: 'keyword',
            },
          },
        },
        start: {
          type: 'date',
        },
        // TODO to allow searching/filtering by status
        // status: {
        //   type: 'keyword'
        // }
      },
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: adHocRunParamsModelVersions,
  });

  // Encrypted attributes
  encryptedSavedObjects.registerType({
    type: RULE_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(RuleAttributesToEncrypt),
    attributesToIncludeInAAD: new Set(RuleAttributesIncludedInAAD),
  });

  // Encrypted attributes
  encryptedSavedObjects.registerType({
    type: 'api_key_pending_invalidation',
    attributesToEncrypt: new Set(['apiKeyId']),
    attributesToIncludeInAAD: new Set(['createdAt']),
  });

  // Encrypted attributes
  encryptedSavedObjects.registerType({
    type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(AdHocRunAttributesToEncrypt),
    attributesToIncludeInAAD: new Set(AdHocRunAttributesIncludedInAAD),
  });
}
