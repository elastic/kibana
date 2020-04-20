/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from '../../../../src/core/server';

import { noteSavedObjectType, noteSavedObjectMappings } from './lib/note/saved_object_mappings';
import {
  pinnedEventSavedObjectType,
  pinnedEventSavedObjectMappings,
} from './lib/pinned_event/saved_object_mappings';
import {
  timelineSavedObjectType,
  timelineSavedObjectMappings,
} from './lib/timeline/saved_object_mappings';
import {
  ruleStatusSavedObjectType,
  ruleStatusSavedObjectMappings,
} from './lib/detection_engine/rules/saved_object_mappings';
import {
  ruleActionsSavedObjectMappings,
  ruleActionsSavedObjectType,
} from './lib/detection_engine/rule_actions/saved_object_mappings';

export {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  ruleStatusSavedObjectType,
  ruleActionsSavedObjectType,
  timelineSavedObjectType,
};

export const initSavedObjects = (savedObjects: CoreSetup['savedObjects']) => {
  savedObjects.registerType({
    name: pinnedEventSavedObjectType,
    hidden: false,
    namespaceType: 'single',
    mappings: pinnedEventSavedObjectMappings,
  });

  savedObjects.registerType({
    name: noteSavedObjectType,
    hidden: false,
    namespaceType: 'single',
    mappings: noteSavedObjectMappings,
  });

  savedObjects.registerType({
    name: ruleStatusSavedObjectType,
    hidden: false,
    namespaceType: 'single',
    mappings: ruleStatusSavedObjectMappings,
  });

  savedObjects.registerType({
    name: ruleActionsSavedObjectType,
    hidden: false,
    namespaceType: 'single',
    mappings: ruleActionsSavedObjectMappings,
  });

  savedObjects.registerType({
    name: timelineSavedObjectType,
    hidden: false,
    namespaceType: 'single',
    mappings: timelineSavedObjectMappings,
  });
};
