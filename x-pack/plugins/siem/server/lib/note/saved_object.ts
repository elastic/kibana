/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { failure } from 'io-ts/lib/PathReporter';
import { RequestAuth } from 'hapi';
import { Legacy } from 'kibana';
import { getOr } from 'lodash/fp';

import { FindOptions } from 'src/legacy/server/saved_objects/service';

import { Pick3 } from '../../../common/utility_types';
import { PageInfoNote, ResponseNote, ResponseNotes, SortNote } from '../../graphql/types';
import { FrameworkRequest, internalFrameworkRequest } from '../framework';
import { SavedNote, NoteSavedObjectRuntimeType, NoteSavedObject } from './types';
import { noteSavedObjectType } from './saved_object_mappings';
import { timelineSavedObjectType } from '../../saved_objects';
import { pickSavedTimeline } from '../timeline/pick_saved_timeline';
import { convertSavedObjectToSavedTimeline } from '../timeline/convert_saved_object_to_savedtimeline';

export class Note {
  constructor(
    private readonly libs: {
      savedObjects: Pick<Legacy.SavedObjectsService, 'getScopedSavedObjectsClient'> &
        Pick3<Legacy.SavedObjectsService, 'SavedObjectsClient', 'errors', 'isConflictError'>;
    }
  ) {}

  public async deleteNote(request: FrameworkRequest, noteIds: string[]) {
    await Promise.all(
      noteIds.map(noteId =>
        this.libs.savedObjects
          .getScopedSavedObjectsClient(request[internalFrameworkRequest])
          .delete(noteSavedObjectType, noteId)
      )
    );
  }

  public async deleteNoteByTimelineId(request: FrameworkRequest, timelineId: string) {
    const options: FindOptions = {
      search: timelineId,
      searchFields: ['timelineId'],
    };
    const notesToBeDeleted = await this.getAllSavedNote(request, options);
    await Promise.all(
      notesToBeDeleted.notes.map(note =>
        this.libs.savedObjects
          .getScopedSavedObjectsClient(request[internalFrameworkRequest])
          .delete(noteSavedObjectType, note.noteId)
      )
    );
  }

  public async getNote(request: FrameworkRequest, noteId: string): Promise<NoteSavedObject> {
    return await this.getSavedNote(request, noteId);
  }

  public async getNotesByEventId(
    request: FrameworkRequest,
    eventId: string
  ): Promise<NoteSavedObject[]> {
    const options: FindOptions = {
      search: eventId,
      searchFields: ['eventId'],
    };
    const notesByEventId = await this.getAllSavedNote(request, options);
    return notesByEventId.notes;
  }

  public async getNotesByTimelineId(
    request: FrameworkRequest,
    timelineId: string
  ): Promise<NoteSavedObject[]> {
    const options: FindOptions = {
      search: timelineId,
      searchFields: ['timelineId'],
    };
    const notesByTimelineId = await this.getAllSavedNote(request, options);
    return notesByTimelineId.notes;
  }

  public async getAllNotes(
    request: FrameworkRequest,
    pageInfo: PageInfoNote | null,
    search: string | null,
    sort: SortNote | null
  ): Promise<ResponseNotes> {
    const options: FindOptions = {
      perPage: pageInfo != null ? pageInfo.pageSize : undefined,
      page: pageInfo != null ? pageInfo.pageIndex : undefined,
      search: search != null ? search : undefined,
      searchFields: ['note'],
      sortField: sort != null ? sort.sortField : undefined,
      sortOrder: sort != null ? sort.sortOrder : undefined,
    };
    return await this.getAllSavedNote(request, options);
  }

  public async persistNote(
    request: FrameworkRequest,
    noteId: string | null,
    version: string | null,
    note: SavedNote
  ): Promise<ResponseNote> {
    let timelineVersionSavedObject = null;
    try {
      if (note.timelineId == null) {
        const timelineResult = convertSavedObjectToSavedTimeline(
          await this.libs.savedObjects
            .getScopedSavedObjectsClient(request[internalFrameworkRequest])
            .create(
              timelineSavedObjectType,
              pickSavedTimeline(null, {}, request[internalFrameworkRequest].auth || null)
            )
        );
        note.timelineId = timelineResult.savedObjectId;
        timelineVersionSavedObject = timelineResult.version;
      }
      if (noteId == null) {
        // Create new note
        return {
          code: 200,
          message: 'success',
          note: convertSavedObjectToSavedNote(
            await this.libs.savedObjects
              .getScopedSavedObjectsClient(request[internalFrameworkRequest])
              .create(
                noteSavedObjectType,
                pickSavedNote(noteId, note, request[internalFrameworkRequest].auth || null)
              ),
            timelineVersionSavedObject != null ? timelineVersionSavedObject : undefined
          ),
        };
      }
      // Update new note
      return {
        code: 200,
        message: 'success',
        note: convertSavedObjectToSavedNote(
          await this.libs.savedObjects
            .getScopedSavedObjectsClient(request[internalFrameworkRequest])
            .update(
              noteSavedObjectType,
              noteId,
              pickSavedNote(noteId, note, request[internalFrameworkRequest].auth || null),
              {
                version: version || undefined,
              }
            )
        ),
      };
    } catch (err) {
      throw err;
    }
  }

  private async getSavedNote(request: FrameworkRequest, NoteId: string) {
    const savedObjectsClient = this.libs.savedObjects.getScopedSavedObjectsClient(
      request[internalFrameworkRequest]
    );

    const savedObject = await savedObjectsClient.get(noteSavedObjectType, NoteId);

    return convertSavedObjectToSavedNote(savedObject);
  }

  private async getAllSavedNote(request: FrameworkRequest, options: FindOptions) {
    const savedObjectsClient = this.libs.savedObjects.getScopedSavedObjectsClient(
      request[internalFrameworkRequest]
    );

    const savedObjects = await savedObjectsClient.find({
      type: noteSavedObjectType,
      ...options,
    });

    return {
      totalCount: savedObjects.total,
      notes: savedObjects.saved_objects.map(savedObject =>
        convertSavedObjectToSavedNote(savedObject)
      ),
    };
  }
}

const convertSavedObjectToSavedNote = (
  savedObject: unknown,
  timelineVersion?: string | undefined | null
): NoteSavedObject =>
  NoteSavedObjectRuntimeType.decode(savedObject)
    .map(savedNote => ({
      noteId: savedNote.id,
      version: savedNote.version,
      timelineVersion,
      ...savedNote.attributes,
    }))
    .getOrElseL(errors => {
      throw new Error(failure(errors).join('\n'));
    });

// we have to use any here because the SavedObjectAttributes interface is like below
// export interface SavedObjectAttributes {
//   [key: string]: SavedObjectAttributes | string | number | boolean | null;
// }
// then this interface does not allow types without index signature
// this is limiting us with our type for now so the easy way was to use any

const pickSavedNote = (
  noteId: string | null,
  savedNote: SavedNote,
  userInfo: RequestAuth
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  if (noteId == null) {
    savedNote.created = new Date().valueOf();
    savedNote.createdBy = getOr(null, 'credentials.username', userInfo);
    savedNote.updated = new Date().valueOf();
    savedNote.updatedBy = getOr(null, 'credentials.username', userInfo);
  } else if (noteId != null) {
    savedNote.updated = new Date().valueOf();
    savedNote.updatedBy = getOr(null, 'credentials.username', userInfo);
  }
  return savedNote;
};
