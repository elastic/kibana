/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { getOr } from 'lodash/fp';

import { FindOptions } from 'src/legacy/server/saved_objects/service';

import { Pick3 } from '../../../common/utility_types';
import {
  ResponseTimeline,
  PageInfoTimeline,
  SortTimeline,
  ResponseFavoriteTimeline,
} from '../../graphql/types';
import { FrameworkRequest, internalFrameworkRequest } from '../framework';
import { NoteSavedObject } from '../note/types';
import { PinnedEventSavedObject } from '../pinned_event/types';

import { SavedTimeline, TimelineSavedObject } from './types';
import { Note } from '../note/saved_object';
import { PinnedEvent } from '../pinned_event/saved_object';
import { timelineSavedObjectType } from './saved_object_mappings';
import { pickSavedTimeline } from './pick_saved_timeline';
import { convertSavedObjectToSavedTimeline } from './convert_saved_object_to_savedtimeline';

interface ResponseTimelines {
  timeline: TimelineSavedObject[];
  totalCount: number;
}

export class Timeline {
  private readonly note: Note;
  private readonly pinnedEvent: PinnedEvent;
  constructor(
    private readonly libs: {
      savedObjects: Pick<Legacy.SavedObjectsService, 'getScopedSavedObjectsClient'> &
        Pick3<Legacy.SavedObjectsService, 'SavedObjectsClient', 'errors', 'isConflictError'>;
    }
  ) {
    this.note = new Note({ savedObjects: this.libs.savedObjects });
    this.pinnedEvent = new PinnedEvent({ savedObjects: this.libs.savedObjects });
  }

  public async getTimeline(
    request: FrameworkRequest,
    timelineId: string
  ): Promise<TimelineSavedObject> {
    return await this.getSavedTimeline(request, timelineId);
  }

  public async getAllTimeline(
    request: FrameworkRequest,
    onlyUserFavorite: boolean | null,
    pageInfo: PageInfoTimeline | null,
    search: string | null,
    sort: SortTimeline | null
  ): Promise<ResponseTimelines> {
    const options: FindOptions = {
      perPage: pageInfo != null ? pageInfo.pageSize : undefined,
      page: pageInfo != null ? pageInfo.pageIndex : undefined,
      search: search != null ? search : undefined,
      searchFields: onlyUserFavorite
        ? ['title', 'description', 'favorite.userName']
        : ['title', 'description'],
      sortField: sort != null ? sort.sortField : undefined,
      sortOrder: sort != null ? sort.sortOrder : undefined,
    };

    return await this.getAllSavedTimeline(request, options);
  }

  public async persistFavorite(
    request: FrameworkRequest,
    timelineId: string | null
  ): Promise<ResponseFavoriteTimeline> {
    let timeline: SavedTimeline = {};
    if (timelineId != null) {
      const {
        eventIdToNoteIds,
        notes,
        noteIds,
        pinnedEventIds,
        pinnedEventsSaveObject,
        savedObjectId,
        version,
        ...savedTimeline
      } = await this.getBasicSavedTimeline(request, timelineId);
      timelineId = savedObjectId;
      timeline = savedTimeline;
    }
    const userName = getOr(null, 'credentials.username', request[internalFrameworkRequest].auth);
    const fullName = getOr(null, 'credentials.fullname', request[internalFrameworkRequest].auth);
    const userFavoriteTimeline = {
      fullName,
      userName,
      favoriteDate: new Date().valueOf(),
    };
    if (timeline.favorite != null) {
      const alreadyExistsTimelineFavoriteByUser = timeline.favorite.findIndex(
        user => user.userName === userName
      );

      timeline.favorite =
        alreadyExistsTimelineFavoriteByUser > -1
          ? [
              ...timeline.favorite.slice(0, alreadyExistsTimelineFavoriteByUser),
              ...timeline.favorite.slice(alreadyExistsTimelineFavoriteByUser + 1),
            ]
          : [...timeline.favorite, userFavoriteTimeline];
    } else if (timeline.favorite == null) {
      timeline.favorite = [userFavoriteTimeline];
    }

    const persistResponse = await this.persistTimeline(request, timelineId, null, timeline);
    return {
      savedObjectId: persistResponse.timeline.savedObjectId,
      version: persistResponse.timeline.version,
      favorite: persistResponse.timeline.favorite != null ? persistResponse.timeline.favorite : [],
    };
  }

  public async persistTimeline(
    request: FrameworkRequest,
    timelineId: string | null,
    version: string | null,
    timeline: SavedTimeline
  ): Promise<ResponseTimeline> {
    if (timelineId == null) {
      // Create new timeline
      return {
        code: 200,
        message: 'success',
        timeline: convertSavedObjectToSavedTimeline(
          await this.libs.savedObjects
            .getScopedSavedObjectsClient(request[internalFrameworkRequest])
            .create(
              timelineSavedObjectType,
              pickSavedTimeline(
                timelineId,
                timeline,
                request[internalFrameworkRequest].auth || null
              )
            )
        ),
      };
    }

    try {
      // Update Timeline
      await this.libs.savedObjects
        .getScopedSavedObjectsClient(request[internalFrameworkRequest])
        .update(
          timelineSavedObjectType,
          timelineId,
          pickSavedTimeline(timelineId, timeline, request[internalFrameworkRequest].auth || null),
          {
            version: version || undefined,
          }
        );
      return {
        code: 200,
        message: 'success',
        timeline: await this.getSavedTimeline(request, timelineId),
      };
    } catch (err) {
      if (this.libs.savedObjects.SavedObjectsClient.errors.isConflictError(err)) {
        return {
          code: 409,
          message: err.message,
          timeline: await this.getSavedTimeline(request, timelineId),
        };
      }
      throw err;
    }
  }

  public async deleteTimeline(request: FrameworkRequest, timelineIds: string[]) {
    await Promise.all(
      timelineIds.map(timelineId =>
        Promise.all([
          this.libs.savedObjects
            .getScopedSavedObjectsClient(request[internalFrameworkRequest])
            .delete(timelineSavedObjectType, timelineId),
          this.note.deleteNoteByTimelineId(request, timelineId),
          this.pinnedEvent.deleteAllPinnedEventsOnTimeline(request, timelineId),
        ])
      )
    );
  }

  private async getBasicSavedTimeline(request: FrameworkRequest, timelineId: string) {
    const savedObjectsClient = this.libs.savedObjects.getScopedSavedObjectsClient(
      request[internalFrameworkRequest]
    );

    const savedObject = await savedObjectsClient.get(timelineSavedObjectType, timelineId);

    return convertSavedObjectToSavedTimeline(savedObject);
  }

  private async getSavedTimeline(request: FrameworkRequest, timelineId: string) {
    const savedObjectsClient = this.libs.savedObjects.getScopedSavedObjectsClient(
      request[internalFrameworkRequest]
    );

    const savedObject = await savedObjectsClient.get(timelineSavedObjectType, timelineId);
    const timelineSaveObject = convertSavedObjectToSavedTimeline(savedObject);
    const timelineWithNotesAndPinnedEvents = await Promise.all([
      this.note.getNotesByTimelineId(request, timelineSaveObject.savedObjectId),
      this.pinnedEvent.getAllPinnedEventsByTimelineId(request, timelineSaveObject.savedObjectId),
      Promise.resolve(timelineSaveObject),
    ]);

    const [notes, pinnedEvents, timeline] = timelineWithNotesAndPinnedEvents;

    return timelineWithReduxProperties(notes, pinnedEvents, timeline);
  }

  private async getAllSavedTimeline(request: FrameworkRequest, options: FindOptions) {
    const savedObjectsClient = this.libs.savedObjects.getScopedSavedObjectsClient(
      request[internalFrameworkRequest]
    );
    if (options.searchFields != null && options.searchFields.includes('favorite.userName')) {
      options.search = `${options.search != null ? options.search : ''} ${getOr(
        null,
        'credentials.username',
        request[internalFrameworkRequest].auth
      )}`;
    }

    const savedObjects = await savedObjectsClient.find({
      type: timelineSavedObjectType,
      ...options,
    });

    const timelinesWithNotesAndPinnedEvents = await Promise.all(
      savedObjects.saved_objects.map(async savedObject => {
        const timelineSaveObject = convertSavedObjectToSavedTimeline(savedObject);
        return Promise.all([
          this.note.getNotesByTimelineId(request, timelineSaveObject.savedObjectId),
          this.pinnedEvent.getAllPinnedEventsByTimelineId(
            request,
            timelineSaveObject.savedObjectId
          ),
          Promise.resolve(timelineSaveObject),
        ]);
      })
    );

    return {
      totalCount: savedObjects.total,
      timeline: timelinesWithNotesAndPinnedEvents.map(([notes, pinnedEvents, timeline]) =>
        timelineWithReduxProperties(notes, pinnedEvents, timeline)
      ),
    };
  }
}

// we have to use any here because the SavedObjectAttributes interface is like below
// export interface SavedObjectAttributes {
//   [key: string]: SavedObjectAttributes | string | number | boolean | null;
// }
// then this interface does not allow types without index signature
// this is limiting us with our type for now so the easy way was to use any

const timelineWithReduxProperties = (
  notes: NoteSavedObject[],
  pinnedEvents: PinnedEventSavedObject[],
  timeline: TimelineSavedObject
): TimelineSavedObject => ({
  ...timeline,
  eventIdToNoteIds: notes.filter(note => note.eventId != null),
  noteIds: notes
    .filter(note => note.eventId == null && note.noteId != null)
    .map(note => note.noteId),
  notes,
  pinnedEventIds: pinnedEvents.map(pinnedEvent => pinnedEvent.eventId),
  pinnedEventsSaveObject: pinnedEvents,
});
