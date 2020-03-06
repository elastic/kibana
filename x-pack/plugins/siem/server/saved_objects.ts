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
  caseSavedObjectType,
  caseSavedObjectMappings,
  caseCommentSavedObjectType,
  caseCommentSavedObjectMappings,
} from './lib/case/saved_object_mappings';

export {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  ruleStatusSavedObjectType,
  timelineSavedObjectType,
};

export const initSavedObjects = (savedObjects: CoreSetup['savedObjects']) => {
  savedObjects.registerType({
    name: pinnedEventSavedObjectType,
    hidden: false,
    namespaceAgnostic: false,
    mappings: pinnedEventSavedObjectMappings,
  });

  savedObjects.registerType({
    name: noteSavedObjectType,
    hidden: false,
    namespaceAgnostic: false,
    mappings: noteSavedObjectMappings,
  });

  savedObjects.registerType({
    name: ruleStatusSavedObjectType,
    hidden: false,
    namespaceAgnostic: false,
    mappings: ruleStatusSavedObjectMappings,
  });

  savedObjects.registerType({
    name: timelineSavedObjectType,
    hidden: false,
    namespaceAgnostic: false,
    mappings: timelineSavedObjectMappings,
  });

  savedObjects.registerType({
    name: caseSavedObjectType,
    hidden: false,
    namespaceAgnostic: false,
    mappings: caseSavedObjectMappings,
  });

  savedObjects.registerType({
    name: caseCommentSavedObjectType,
    hidden: false,
    namespaceAgnostic: false,
    mappings: caseCommentSavedObjectMappings,
  });
};
