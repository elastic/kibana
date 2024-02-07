/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { failure } from 'io-ts/lib/PathReporter';
import { getOr } from 'lodash/fp';
import { v1 as uuidv1 } from 'uuid';

import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import type { SavedObjectsFindOptions } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { UNAUTHENTICATED_USER } from '../../../../../common/constants';
import type {
  Note,
  BareNote,
  BareNoteWithoutExternalRefs,
  ResponseNote,
} from '../../../../../common/api/timeline';
import { SavedObjectNoteRuntimeType } from '../../../../../common/types/timeline/note/saved_object';
import type { SavedObjectNoteWithoutExternalRefs } from '../../../../../common/types/timeline/note/saved_object';
import type { FrameworkRequest } from '../../../framework';
import { noteSavedObjectType } from '../../saved_object_mappings/notes';
import { createTimeline } from '../timelines';
import { timelineSavedObjectType } from '../../saved_object_mappings';
import { noteFieldsMigrator } from './field_migrator';

export const deleteNoteByTimelineId = async (request: FrameworkRequest, timelineId: string) => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    hasReference: { type: timelineSavedObjectType, id: timelineId },
  };
  const notesToBeDeleted = await getAllSavedNote(request, options);
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const noteObjects = notesToBeDeleted.notes.map((note) => {
    return {
      id: note.noteId,
      type: noteSavedObjectType,
    };
  });

  await savedObjectsClient.bulkDelete(noteObjects);
};

export const deleteNote = async ({
  request,
  noteId,
}: {
  request: FrameworkRequest;
  noteId: string;
}) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;

  await savedObjectsClient.delete(noteSavedObjectType, noteId);
};

export const getNote = async (request: FrameworkRequest, noteId: string): Promise<Note> => {
  return getSavedNote(request, noteId);
};

export const getNotesByTimelineId = async (
  request: FrameworkRequest,
  timelineId: string
): Promise<Note[]> => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    hasReference: { type: timelineSavedObjectType, id: timelineId },
  };
  const notesByTimelineId = await getAllSavedNote(request, options);
  return notesByTimelineId.notes;
};

export const persistNote = async ({
  request,
  noteId,
  note,
  overrideOwner = true,
}: {
  request: FrameworkRequest;
  noteId: string | null;
  note: BareNote;
  overrideOwner?: boolean;
}): Promise<ResponseNote> => {
  try {
    if (noteId == null) {
      return await createNote({
        request,
        noteId,
        note,
        overrideOwner,
      });
    }

    // Update existing note
    return await updateNote({ request, noteId, note, overrideOwner });
  } catch (err) {
    if (getOr(null, 'output.statusCode', err) === 403) {
      const noteToReturn: Note = {
        ...note,
        noteId: uuidv1(),
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

const createNote = async ({
  request,
  noteId,
  note,
  overrideOwner = true,
}: {
  request: FrameworkRequest;
  noteId: string | null;
  note: BareNote;
  overrideOwner?: boolean;
}) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const userInfo = request.user;

  const shallowCopyOfNote = { ...note };
  let timelineVersion: string | undefined;

  if (note.timelineId == null) {
    const { timeline: timelineResult } = await createTimeline({
      timelineId: null,
      timeline: {},
      savedObjectsClient,
      userInfo,
    });

    shallowCopyOfNote.timelineId = timelineResult.savedObjectId;
    timelineVersion = timelineResult.version;
  }

  const noteWithCreator = overrideOwner
    ? pickSavedNote(noteId, shallowCopyOfNote, userInfo)
    : shallowCopyOfNote;

  const { transformedFields: migratedAttributes, references } =
    noteFieldsMigrator.extractFieldsToReferences<BareNoteWithoutExternalRefs>({
      data: noteWithCreator,
    });

  const noteAttributes: SavedObjectNoteWithoutExternalRefs = {
    eventId: migratedAttributes.eventId,
    note: migratedAttributes.note,
    created: migratedAttributes.created,
    createdBy: migratedAttributes.createdBy,
    updated: migratedAttributes.updated,
    updatedBy: migratedAttributes.updatedBy,
  };

  const createdNote = await savedObjectsClient.create<SavedObjectNoteWithoutExternalRefs>(
    noteSavedObjectType,
    noteAttributes,
    {
      references,
    }
  );

  const repopulatedSavedObject = noteFieldsMigrator.populateFieldsFromReferences(createdNote);

  const convertedNote = convertSavedObjectToSavedNote(repopulatedSavedObject, timelineVersion);

  // Create new note
  return {
    code: 200,
    message: 'success',
    note: convertedNote,
  };
};

const updateNote = async ({
  request,
  noteId,
  note,
  overrideOwner = true,
}: {
  request: FrameworkRequest;
  noteId: string;
  note: BareNote;
  overrideOwner?: boolean;
}) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const userInfo = request.user;

  const existingNote = await savedObjectsClient.get<SavedObjectNoteWithoutExternalRefs>(
    noteSavedObjectType,
    noteId
  );

  const noteWithCreator = overrideOwner ? pickSavedNote(noteId, note, userInfo) : note;

  const { transformedFields: migratedPatchAttributes, references } =
    noteFieldsMigrator.extractFieldsToReferences<BareNoteWithoutExternalRefs>({
      data: noteWithCreator,
      existingReferences: existingNote.references,
    });

  const noteAttributes: SavedObjectNoteWithoutExternalRefs = {
    eventId: migratedPatchAttributes.eventId,
    note: migratedPatchAttributes.note,
    created: migratedPatchAttributes.created,
    createdBy: migratedPatchAttributes.createdBy,
    updated: migratedPatchAttributes.updated,
    updatedBy: migratedPatchAttributes.updatedBy,
  };

  const updatedNote = await savedObjectsClient.update(noteSavedObjectType, noteId, noteAttributes, {
    version: existingNote.version || undefined,
    references,
  });

  const populatedNote = noteFieldsMigrator.populateFieldsFromReferencesForPatch({
    dataBeforeRequest: note,
    dataReturnedFromRequest: updatedNote,
  });

  const convertedNote = convertSavedObjectToSavedNote(populatedNote);

  return {
    code: 200,
    message: 'success',
    note: convertedNote,
  };
};

const getSavedNote = async (request: FrameworkRequest, NoteId: string) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const savedObject = await savedObjectsClient.get<SavedObjectNoteWithoutExternalRefs>(
    noteSavedObjectType,
    NoteId
  );

  const populatedNote = noteFieldsMigrator.populateFieldsFromReferences(savedObject);

  return convertSavedObjectToSavedNote(populatedNote);
};

const getAllSavedNote = async (request: FrameworkRequest, options: SavedObjectsFindOptions) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const savedObjects = await savedObjectsClient.find<SavedObjectNoteWithoutExternalRefs>(options);

  return {
    totalCount: savedObjects.total,
    notes: savedObjects.saved_objects.map((savedObject) => {
      const populatedNote = noteFieldsMigrator.populateFieldsFromReferences(savedObject);

      return convertSavedObjectToSavedNote(populatedNote);
    }),
  };
};

export const convertSavedObjectToSavedNote = (
  savedObject: unknown,
  timelineVersion?: string | undefined | null
): Note =>
  pipe(
    SavedObjectNoteRuntimeType.decode(savedObject),
    map((savedNote) => {
      return {
        noteId: savedNote.id,
        version: savedNote.version,
        timelineVersion,
        timelineId: savedNote.attributes.timelineId,
        eventId: savedNote.attributes.eventId,
        note: savedNote.attributes.note,
        created: savedNote.attributes.created,
        createdBy: savedNote.attributes.createdBy,
        updated: savedNote.attributes.updated,
        updatedBy: savedNote.attributes.updatedBy,
      };
    }),
    fold((errors) => {
      throw new Error(failure(errors).join('\n'));
    }, identity)
  );

export const pickSavedNote = (
  noteId: string | null,
  savedNote: BareNote,
  userInfo: AuthenticatedUser | null
) => {
  if (noteId == null) {
    savedNote.created = new Date().valueOf();
    savedNote.createdBy = userInfo ? getUserDisplayName(userInfo) : UNAUTHENTICATED_USER;
  }

  savedNote.updated = new Date().valueOf();
  savedNote.updatedBy = userInfo ? getUserDisplayName(userInfo) : UNAUTHENTICATED_USER;
  return savedNote;
};
