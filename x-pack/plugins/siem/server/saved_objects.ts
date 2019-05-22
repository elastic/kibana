/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { noteSavedObjectMappings, noteSavedObjectType } from './lib/note';
import { timelineSavedObjectMappings, timelineSavedObjectType } from './lib/timeline';
import { pinnedEventSavedObjectMappings, pinnedEventSavedObjectType } from './lib/pinned_event';

export { noteSavedObjectType, pinnedEventSavedObjectType, timelineSavedObjectType };
export const savedObjectMappings = {
  ...timelineSavedObjectMappings,
  ...noteSavedObjectMappings,
  ...pinnedEventSavedObjectMappings,
};
