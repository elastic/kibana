/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
} from '../../../../../../../../src/core/server';
import { noteSavedObjectType } from '../../saved_object_mappings';
import { convertSavedObjectToSavedNote } from '../../saved_object';

export const getAllSavedNote = async (
  savedObjectsClient: SavedObjectsClientContract,
  options: SavedObjectsFindOptions
) => {
  const savedObjects = await savedObjectsClient.find(options);

  return {
    totalCount: savedObjects.total,
    notes: savedObjects.saved_objects.map(savedObject =>
      convertSavedObjectToSavedNote(savedObject)
    ),
  };
};

export const deleteNoteByTimelineId = async (
  savedObjectsClient: SavedObjectsClientContract,
  timelineId: string
) => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  const notesToBeDeleted = await getAllSavedNote(savedObjectsClient, options);

  await Promise.all(
    notesToBeDeleted.notes.map(note => savedObjectsClient.delete(noteSavedObjectType, note.noteId))
  );
};
