/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { failure } from 'io-ts/lib/PathReporter';
import { getOr } from 'lodash/fp';
import uuid from 'uuid';

import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { SavedObjectsFindOptions } from '../../../../../../src/core/server';
import { AuthenticatedUser } from '../../../../security/common/model';
import { UNAUTHENTICATED_USER } from '../../../common/constants';
import {
  SavedNote,
  NoteSavedObjectRuntimeType,
  NoteSavedObject,
} from '../../../common/types/timeline/note';
import {
  PageInfoNote,
  ResponseNote,
  ResponseNotes,
  SortNote,
  NoteResult,
} from '../../graphql/types';
import { FrameworkRequest } from '../framework';
import { noteSavedObjectType } from './saved_object_mappings';
import { pickSavedTimeline } from '../timeline/pick_saved_timeline';
import { convertSavedObjectToSavedTimeline } from '../timeline/convert_saved_object_to_savedtimeline';
import { timelineSavedObjectType } from '../timeline/saved_object_mappings';

export interface Note {
  deleteNote: (request: FrameworkRequest, noteIds: string[]) => Promise<void>;
  deleteNoteByTimelineId: (request: FrameworkRequest, noteIds: string) => Promise<void>;
  getNote: (request: FrameworkRequest, noteId: string) => Promise<NoteSavedObject>;
  getNotesByEventId: (request: FrameworkRequest, noteId: string) => Promise<NoteSavedObject[]>;
  getNotesByTimelineId: (request: FrameworkRequest, noteId: string) => Promise<NoteSavedObject[]>;
  getAllNotes: (
    request: FrameworkRequest,
    pageInfo: PageInfoNote | null,
    search: string | null,
    sort: SortNote | null
  ) => Promise<ResponseNotes>;
  persistNote: (
    request: FrameworkRequest,
    noteId: string | null,
    version: string | null,
    note: SavedNote
  ) => Promise<ResponseNote>;
  convertSavedObjectToSavedNote: (
    savedObject: unknown,
    timelineVersion?: string | undefined | null
  ) => NoteSavedObject;
}

export const deleteNote = async (request: FrameworkRequest, noteIds: string[]) => {
  const savedObjectsClient = request.context.core.savedObjects.client;

  await Promise.all(
    noteIds.map((noteId) => savedObjectsClient.delete(noteSavedObjectType, noteId))
  );
};

export const deleteNoteByTimelineId = async (request: FrameworkRequest, timelineId: string) => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  const notesToBeDeleted = await getAllSavedNote(request, options);
  const savedObjectsClient = request.context.core.savedObjects.client;

  await Promise.all(
    notesToBeDeleted.notes.map((note) =>
      savedObjectsClient.delete(noteSavedObjectType, note.noteId)
    )
  );
};

export const getNote = async (
  request: FrameworkRequest,
  noteId: string
): Promise<NoteSavedObject> => {
  return getSavedNote(request, noteId);
};

export const getNotesByEventId = async (
  request: FrameworkRequest,
  eventId: string
): Promise<NoteSavedObject[]> => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    search: eventId,
    searchFields: ['eventId'],
  };
  const notesByEventId = await getAllSavedNote(request, options);
  return notesByEventId.notes;
};

export const getNotesByTimelineId = async (
  request: FrameworkRequest,
  timelineId: string
): Promise<NoteSavedObject[]> => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  const notesByTimelineId = await getAllSavedNote(request, options);
  return notesByTimelineId.notes;
};

export const getAllNotes = async (
  request: FrameworkRequest,
  pageInfo: PageInfoNote | null,
  search: string | null,
  sort: SortNote | null
): Promise<ResponseNotes> => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    perPage: pageInfo != null ? pageInfo.pageSize : undefined,
    page: pageInfo != null ? pageInfo.pageIndex : undefined,
    search: search != null ? search : undefined,
    searchFields: ['note'],
    sortField: sort != null ? sort.sortField : undefined,
    sortOrder: sort != null ? sort.sortOrder : undefined,
  };
  return getAllSavedNote(request, options);
};

export const persistNote = async (
  request: FrameworkRequest,
  noteId: string | null,
  version: string | null,
  note: SavedNote
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
            pickSavedNote(noteId, note, request.user)
          ),
          timelineVersionSavedObject != null ? timelineVersionSavedObject : undefined
        ),
      };
    }

    // Update new note

    const existingNote = await getSavedNote(request, noteId);
    return {
      code: 200,
      message: 'success',
      note: convertSavedObjectToSavedNote(
        await savedObjectsClient.update(
          noteSavedObjectType,
          noteId,
          pickSavedNote(noteId, note, request.user),
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

const getSavedNote = async (request: FrameworkRequest, NoteId: string) => {
  const savedObjectsClient = request.context.core.savedObjects.client;
  const savedObject = await savedObjectsClient.get(noteSavedObjectType, NoteId);

  return convertSavedObjectToSavedNote(savedObject);
};

const getAllSavedNote = async (request: FrameworkRequest, options: SavedObjectsFindOptions) => {
  const savedObjectsClient = request.context.core.savedObjects.client;
  const savedObjects = await savedObjectsClient.find(options);

  return {
    totalCount: savedObjects.total,
    notes: savedObjects.saved_objects.map((savedObject) =>
      convertSavedObjectToSavedNote(savedObject)
    ),
  };
};

export const convertSavedObjectToSavedNote = (
  savedObject: unknown,
  timelineVersion?: string | undefined | null
): NoteSavedObject =>
  pipe(
    NoteSavedObjectRuntimeType.decode(savedObject),
    map((savedNote) => ({
      noteId: savedNote.id,
      version: savedNote.version,
      timelineVersion,
      ...savedNote.attributes,
    })),
    fold((errors) => {
      throw new Error(failure(errors).join('\n'));
    }, identity)
  );

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
