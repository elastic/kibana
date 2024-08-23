/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';

import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { protectionUpdatesNoteType } from './endpoint/lib/protection_updates_note/saved_object_mappings';
import { noteType, pinnedEventType, timelineType } from './lib/timeline/saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import { legacyType as legacyRuleActionsType } from './lib/detection_engine/rule_actions_legacy';
import { prebuiltRuleAssetType } from './lib/detection_engine/prebuilt_rules';
import { type as signalsMigrationType } from './lib/detection_engine/migrations/saved_objects';
import { manifestType, unifiedManifestType } from './endpoint/lib/artifacts/saved_object_mappings';
import { riskEngineConfigurationType } from './lib/entity_analytics/risk_engine/saved_object';
import {
  externalRuleSourceSOType,
  externalRuleSourceEncryptedSOType,
} from './lib/detection_engine/external_rule_sources/logic/rule_repositories_type';

const types = [
  noteType,
  pinnedEventType,
  legacyRuleActionsType,
  prebuiltRuleAssetType,
  timelineType,
  manifestType,
  unifiedManifestType,
  signalsMigrationType,
  riskEngineConfigurationType,
  protectionUpdatesNoteType,
  externalRuleSourceSOType,
];

const encryptedSavedObjectTypes = [externalRuleSourceEncryptedSOType];

export const savedObjectTypes = types.map((type) => type.name);

export const initSavedObjects = (
  savedObjects: CoreSetup['savedObjects'],
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) => {
  types.forEach((type) => savedObjects.registerType(type));
  encryptedSavedObjectTypes.forEach((type) => encryptedSavedObjects.registerType(type));
};
