/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NoteResult, SavedNote } from '../../../../../common/types/timeline/note';
import type { FrameworkRequest } from '../../../framework';
import { getNote } from './saved_object';

/**
 * When importing timeline with an existing note by others, we don't want override the owner.
 *  In this case we can set overrideOwner to false to keep the original author
 */

export const getOverridableNote = async (
  frameworkRequest: FrameworkRequest,
  note: NoteResult,
  timelineSavedObjectId: string,
  overrideOwner: boolean
): Promise<SavedNote> => {
  let savedNote = note;
  try {
    savedNote = await getNote(frameworkRequest, note.noteId);
    // eslint-disable-next-line no-empty
  } catch (e) {}
  return overrideOwner
    ? {
        eventId: note.eventId,
        note: note.note,
        timelineId: timelineSavedObjectId,
      }
    : {
        eventId: savedNote.eventId,
        note: savedNote.note,
        created: savedNote.created,
        createdBy: savedNote.createdBy,
        updated: savedNote.updated,
        updatedBy: savedNote.updatedBy,
        timelineId: timelineSavedObjectId,
      };
};
