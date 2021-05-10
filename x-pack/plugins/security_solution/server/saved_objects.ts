/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '../../../../src/core/server';

import { noteType, pinnedEventType, timelineType } from './lib/timeline/saved_object_mappings';
import {
  type as ruleStatusType,
  ruleAssetType,
} from './lib/detection_engine/rules/saved_object_mappings';
import { type as ruleActionsType } from './lib/detection_engine/rule_actions/saved_object_mappings';
import { type as signalsMigrationType } from './lib/detection_engine/migrations/saved_objects';
import {
  exceptionsArtifactType,
  manifestType,
} from './endpoint/lib/artifacts/saved_object_mappings';

const types = [
  noteType,
  pinnedEventType,
  ruleActionsType,
  ruleStatusType,
  ruleAssetType,
  timelineType,
  exceptionsArtifactType,
  manifestType,
  signalsMigrationType,
];

export const savedObjectTypes = types.map((type) => type.name);

export const initSavedObjects = (savedObjects: CoreSetup['savedObjects']) => {
  types.forEach((type) => savedObjects.registerType(type));
};
