/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from '../../../../src/core/server';

import { type as noteType } from './lib/note/saved_object_mappings';
import { type as pinnedEventType } from './lib/pinned_event/saved_object_mappings';
import { type as timelineType } from './lib/timeline/saved_object_mappings';
import { type as ruleStatusType } from './lib/detection_engine/rules/saved_object_mappings';
import { type as ruleActionsType } from './lib/detection_engine/rule_actions/saved_object_mappings';
import {
  exceptionsArtifactType,
  manifestType,
} from './endpoint/lib/artifacts/saved_object_mappings';

const types = [
  noteType,
  pinnedEventType,
  ruleActionsType,
  ruleStatusType,
  timelineType,
  exceptionsArtifactType,
  manifestType,
];

export const savedObjectTypes = types.map((type) => type.name);

export const initSavedObjects = (savedObjects: CoreSetup['savedObjects']) => {
  types.forEach((type) => savedObjects.registerType(type));
};
