/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getOr } from 'lodash/fp';
import uuid from 'uuid';

import { AuthenticatedUser } from '../../../../security/common/model';
import { SavedNote } from '../../../common/types/timeline/note';
import { UNAUTHENTICATED_USER } from '../../../common/constants';

import { ResponseNote, NoteResult } from '../../graphql/types';

import { FrameworkRequest } from '../framework';
import { timelineSavedObjectType } from '../timeline/saved_object_mappings';
import { convertSavedObjectToSavedTimeline } from '../timeline/convert_saved_object_to_savedtimeline';
import { pickSavedTimeline } from '../timeline/pick_saved_timeline';

import { convertSavedObjectToSavedNote } from './saved_object';
import { noteSavedObjectType } from './saved_object_mappings';

// we have to use any here because the SavedObjectAttributes interface is like below
// export interface SavedObjectAttributes {
//   [key: string]: SavedObjectAttributes | string | number | boolean | null;
// }
// then this interface does not allow types without index signature
// this is limiting us with our type for now so the easy way was to use any

const pickSavedNote = (
  noteId: string | null,
  savedNote: SavedNote,
  userInfo: AuthenticatedUser | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  if (noteId == null) {
    savedNote.created = new Date().valueOf();
    savedNote.createdBy = userInfo?.username ?? UNAUTHENTICATED_USER;
    savedNote.updated = new Date().valueOf();
    savedNote.updatedBy = userInfo?.username ?? UNAUTHENTICATED_USER;
  } else if (noteId != null) {
    savedNote.updated = new Date().valueOf();
    savedNote.updatedBy = userInfo?.username ?? UNAUTHENTICATED_USER;
  }
  return savedNote;
};

export const persistNote = async (
  request: FrameworkRequest,
  noteId: string | null,
  version: string | null,
  note: SavedNote,
  overrideOwner: boolean = true
): Promise<ResponseNote> => {
  try {
    const savedObjectsClient = request.context.core.savedObjects.client;

    if (noteId == null) {
      const timelineVersionSavedObject =
        note.timelineId == null
          ? await (async () => {
              const timelineResult = convertSavedObjectToSavedTimeline(
                await savedObjectsClient.create(
                  timelineSavedObjectType,
                  pickSavedTimeline(null, {}, request.user)
                )
              );
              note.timelineId = timelineResult.savedObjectId;
              return timelineResult.version;
            })()
          : null;

      // Create new note
      return {
        code: 200,
        message: 'success',
        note: convertSavedObjectToSavedNote(
          await savedObjectsClient.create(
            noteSavedObjectType,
            overrideOwner ? pickSavedNote(noteId, note, request.user) : note
          ),
          timelineVersionSavedObject != null ? timelineVersionSavedObject : undefined
        ),
      };
    }

    // Update existing note

    const existingNote = await getNote(request, noteId);
    return {
      code: 200,
      message: 'success',
      note: convertSavedObjectToSavedNote(
        await savedObjectsClient.update(
          noteSavedObjectType,
          noteId,
          overrideOwner ? pickSavedNote(noteId, note, request.user) : note,
          {
            version: existingNote.version || undefined,
          }
        )
      ),
    };
  } catch (err) {
    if (getOr(null, 'output.statusCode', err) === 403) {
      const noteToReturn: NoteResult = {
        ...note,
        noteId: uuid.v1(),
        version: '',
        timelineId: '',
        timelineVersion: '',
      };
      return {
        code: 403,
        message: err.message,
        note: noteToReturn,
      };
    }
    throw err;
  }
};
