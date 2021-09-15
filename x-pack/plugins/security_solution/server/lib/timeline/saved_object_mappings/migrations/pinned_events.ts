/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectMigrationMap,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from 'kibana/server';
import { pinnedEventSavedObjectType } from '..';
import { migrateTimelineIdToReferences } from './utils';
import { TimelineId } from './types';

export const migratePinnedEventsTimelineIdToReferences = (
  doc: SavedObjectUnsanitizedDoc<TimelineId>
): SavedObjectSanitizedDoc<unknown> => {
  return migrateTimelineIdToReferences(doc, pinnedEventSavedObjectType);
};

export const pinnedEventsMigrations: SavedObjectMigrationMap = {
  '7.16.0': migratePinnedEventsTimelineIdToReferences,
};
