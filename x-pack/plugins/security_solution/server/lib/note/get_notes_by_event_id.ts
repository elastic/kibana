/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { NoteSavedObject } from '../../../common/types/timeline/note';
import { FrameworkRequest } from '../framework';
import { getAllSavedNotes } from './get_all_saved_notes';

export const getNotesByEventId = async (
  request: FrameworkRequest,
  eventId: string
): Promise<NoteSavedObject[]> => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    search: eventId,
    searchFields: ['eventId'],
  };
  const notesByEventId = await getAllSavedNotes(request, options);
  return notesByEventId.notes;
};
