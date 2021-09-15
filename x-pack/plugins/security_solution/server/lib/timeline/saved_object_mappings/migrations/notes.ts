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
import { timelineSavedObjectType } from '..';
import { TIMELINE_ID_REF_NAME } from '../../constants';
import { TimelineId } from './types';
import { createMigratedDoc, createReference } from './utils';

export const migrateNoteTimelineIdToReferences = (
  doc: SavedObjectUnsanitizedDoc<TimelineId>
): SavedObjectSanitizedDoc<unknown> => {
  const { timelineId, ...restAttributes } = doc.attributes;

  const { references: docReferences = [] } = doc;
  const timelineIdReferences = createReference(
    timelineId,
    TIMELINE_ID_REF_NAME,
    timelineSavedObjectType
  );

  return createMigratedDoc({
    doc,
    attributes: restAttributes,
    docReferences,
    migratedReferences: timelineIdReferences,
  });
};

export const notesMigrations: SavedObjectMigrationMap = {
  '7.16.0': migrateNoteTimelineIdToReferences,
};
