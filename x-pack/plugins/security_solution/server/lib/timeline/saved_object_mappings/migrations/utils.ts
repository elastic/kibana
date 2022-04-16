/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectReference,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core/server';
import { timelineSavedObjectType } from '../timelines';
import { TIMELINE_ID_REF_NAME } from '../../constants';
import { TimelineId } from './types';

export function createReference(
  id: string | null | undefined,
  name: string,
  type: string
): SavedObjectReference[] {
  return id != null ? [{ id, name, type }] : [];
}

export const migrateTimelineIdToReferences = (
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

export const createMigratedDoc = <T>({
  doc,
  attributes,
  docReferences,
  migratedReferences,
}: {
  doc: SavedObjectUnsanitizedDoc<T>;
  attributes: object;
  docReferences: SavedObjectReference[];
  migratedReferences: SavedObjectReference[];
}): SavedObjectSanitizedDoc<unknown> => ({
  ...doc,
  attributes: {
    ...attributes,
  },
  references: [...docReferences, ...migratedReferences],
});
