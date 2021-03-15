/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FrameworkRequest } from '../framework';
import { SavedObjectsFindOptions } from '../../../../../../src/core/server';
import { noteSavedObjectType } from './saved_object_mappings';
import { getAllSavedNotes } from './get_all_saved_notes';

export const deleteNoteByTimelineId = async (request: FrameworkRequest, timelineId: string) => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  const notesToBeDeleted = await getAllSavedNotes(request, options);
  const savedObjectsClient = request.context.core.savedObjects.client;

  await Promise.all(
    notesToBeDeleted.notes.map((note) =>
      savedObjectsClient.delete(noteSavedObjectType, note.noteId)
    )
  );
};
