/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FrameworkRequest } from '../../../framework';
import { persistNote } from './saved_object';
import { getOverridableNote } from './get_overridable_note';
import type { Note } from '../../../../../common/api/timeline';

export const persistNotes = async (
  frameworkRequest: FrameworkRequest,
  timelineSavedObjectId: string,
  existingNoteIds?: string[],
  newNotes?: Note[],
  overrideOwner: boolean = true
) => {
  return Promise.all(
    newNotes?.map(async (note) => {
      const newNote = await getOverridableNote(
        frameworkRequest,
        note,
        timelineSavedObjectId,
        overrideOwner
      );
      return persistNote({
        request: frameworkRequest,
        noteId: overrideOwner ? existingNoteIds?.find((nId) => nId === note.noteId) ?? null : null,
        note: newNote,
        overrideOwner,
      });
    }) ?? []
  );
};
