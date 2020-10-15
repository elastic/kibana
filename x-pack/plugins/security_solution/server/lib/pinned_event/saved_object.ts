/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { failure } from 'io-ts/lib/PathReporter';
import { getOr } from 'lodash/fp';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { SavedObjectsFindOptions } from '../../../../../../src/core/server';
import { AuthenticatedUser } from '../../../../security/common/model';
import { UNAUTHENTICATED_USER } from '../../../common/constants';
import {
  PinnedEventSavedObject,
  PinnedEventSavedObjectRuntimeType,
  SavedPinnedEvent,
} from '../../../common/types/timeline/pinned_event';
import { FrameworkRequest } from '../framework';

import { PageInfoNote, SortNote, PinnedEvent as PinnedEventResponse } from '../../graphql/types';
import { pickSavedTimeline } from '../timeline/pick_saved_timeline';
import { convertSavedObjectToSavedTimeline } from '../timeline/convert_saved_object_to_savedtimeline';
import { pinnedEventSavedObjectType } from './saved_object_mappings';
import { timelineSavedObjectType } from '../timeline/saved_object_mappings';

export interface PinnedEvent {
  deletePinnedEventOnTimeline: (
    request: FrameworkRequest,
    pinnedEventIds: string[]
  ) => Promise<void>;

  deleteAllPinnedEventsOnTimeline: (request: FrameworkRequest, timelineId: string) => Promise<void>;

  getPinnedEvent: (
    request: FrameworkRequest,
    pinnedEventId: string
  ) => Promise<PinnedEventSavedObject>;

  getAllPinnedEventsByTimelineId: (
    request: FrameworkRequest,
    timelineId: string
  ) => Promise<PinnedEventSavedObject[]>;

  getAllPinnedEvents: (
    request: FrameworkRequest,
    pageInfo: PageInfoNote | null,
    search: string | null,
    sort: SortNote | null
  ) => Promise<PinnedEventSavedObject[]>;

  persistPinnedEventOnTimeline: (
    request: FrameworkRequest,
    pinnedEventId: string | null, // pinned event saved object id
    eventId: string,
    timelineId: string | null
  ) => Promise<PinnedEventResponse | null>;

  convertSavedObjectToSavedPinnedEvent: (
    savedObject: unknown,
    timelineVersion?: string | undefined | null
  ) => PinnedEventSavedObject;

  pickSavedPinnedEvent: (
    pinnedEventId: string | null,
    savedPinnedEvent: SavedPinnedEvent,
    userInfo: AuthenticatedUser | null
  ) => // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any;
}

export const deletePinnedEventOnTimeline = async (
  request: FrameworkRequest,
  pinnedEventIds: string[]
) => {
  const savedObjectsClient = request.context.core.savedObjects.client;

  await Promise.all(
    pinnedEventIds.map((pinnedEventId) =>
      savedObjectsClient.delete(pinnedEventSavedObjectType, pinnedEventId)
    )
  );
};

export const deleteAllPinnedEventsOnTimeline = async (
  request: FrameworkRequest,
  timelineId: string
) => {
  const savedObjectsClient = request.context.core.savedObjects.client;
  const options: SavedObjectsFindOptions = {
    type: pinnedEventSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  const pinnedEventToBeDeleted = await getAllSavedPinnedEvents(request, options);
  await Promise.all(
    pinnedEventToBeDeleted.map((pinnedEvent) =>
      savedObjectsClient.delete(pinnedEventSavedObjectType, pinnedEvent.pinnedEventId)
    )
  );
};

export const getPinnedEvent = async (
  request: FrameworkRequest,
  pinnedEventId: string
): Promise<PinnedEventSavedObject> => {
  return getSavedPinnedEvent(request, pinnedEventId);
};

export const getAllPinnedEventsByTimelineId = async (
  request: FrameworkRequest,
  timelineId: string
): Promise<PinnedEventSavedObject[]> => {
  const options: SavedObjectsFindOptions = {
    type: pinnedEventSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  return getAllSavedPinnedEvents(request, options);
};

export const getAllPinnedEvents = async (
  request: FrameworkRequest,
  pageInfo: PageInfoNote | null,
  search: string | null,
  sort: SortNote | null
): Promise<PinnedEventSavedObject[]> => {
  const options: SavedObjectsFindOptions = {
    type: pinnedEventSavedObjectType,
    perPage: pageInfo != null ? pageInfo.pageSize : undefined,
    page: pageInfo != null ? pageInfo.pageIndex : undefined,
    search: search != null ? search : undefined,
    searchFields: ['timelineId', 'eventId'],
    sortField: sort != null ? sort.sortField : undefined,
    sortOrder: sort != null ? sort.sortOrder : undefined,
  };
  return getAllSavedPinnedEvents(request, options);
};

export const persistPinnedEventOnTimeline = async (
  request: FrameworkRequest,
  pinnedEventId: string | null, // pinned event saved object id
  eventId: string,
  timelineId: string | null
): Promise<PinnedEventResponse | null> => {
  const savedObjectsClient = request.context.core.savedObjects.client;

  try {
    if (pinnedEventId == null) {
      const timelineVersionSavedObject =
        timelineId == null
          ? await (async () => {
              const timelineResult = convertSavedObjectToSavedTimeline(
                await savedObjectsClient.create(
                  timelineSavedObjectType,
                  pickSavedTimeline(null, {}, request.user || null)
                )
              );
              timelineId = timelineResult.savedObjectId; // eslint-disable-line no-param-reassign
              return timelineResult.version;
            })()
          : null;

      if (timelineId != null) {
        const allPinnedEventId = await getAllPinnedEventsByTimelineId(request, timelineId);
        const isPinnedAlreadyExisting = allPinnedEventId.filter(
          (pinnedEvent) => pinnedEvent.eventId === eventId
        );

        if (isPinnedAlreadyExisting.length === 0) {
          const savedPinnedEvent: SavedPinnedEvent = {
            eventId,
            timelineId,
          };
          // create Pinned Event on Timeline
          return convertSavedObjectToSavedPinnedEvent(
            await savedObjectsClient.create(
              pinnedEventSavedObjectType,
              pickSavedPinnedEvent(pinnedEventId, savedPinnedEvent, request.user || null)
            ),
            timelineVersionSavedObject != null ? timelineVersionSavedObject : undefined
          );
        }
        return isPinnedAlreadyExisting[0];
      }
      throw new Error('You can NOT pinned event without a timelineID');
    }
    // Delete Pinned Event on Timeline
    await deletePinnedEventOnTimeline(request, [pinnedEventId]);
    return null;
  } catch (err) {
    if (getOr(null, 'output.statusCode', err) === 404) {
      /*
       * Why we are doing that, because if it is not found for sure that it will be unpinned
       * There is no need to bring back this error since we can assume that it is unpinned
       */
      return null;
    }
    if (getOr(null, 'output.statusCode', err) === 403) {
      return pinnedEventId != null
        ? {
            code: 403,
            message: err.message,
            pinnedEventId: eventId,
            timelineId: '',
            timelineVersion: '',
          }
        : null;
    }
    throw err;
  }
};

const getSavedPinnedEvent = async (request: FrameworkRequest, pinnedEventId: string) => {
  const savedObjectsClient = request.context.core.savedObjects.client;
  const savedObject = await savedObjectsClient.get(pinnedEventSavedObjectType, pinnedEventId);

  return convertSavedObjectToSavedPinnedEvent(savedObject);
};

const getAllSavedPinnedEvents = async (
  request: FrameworkRequest,
  options: SavedObjectsFindOptions
) => {
  const savedObjectsClient = request.context.core.savedObjects.client;
  const savedObjects = await savedObjectsClient.find(options);

  return savedObjects.saved_objects.map((savedObject) =>
    convertSavedObjectToSavedPinnedEvent(savedObject)
  );
};

export const convertSavedObjectToSavedPinnedEvent = (
  savedObject: unknown,
  timelineVersion?: string | undefined | null
): PinnedEventSavedObject =>
  pipe(
    PinnedEventSavedObjectRuntimeType.decode(savedObject),
    map((savedPinnedEvent) => ({
      pinnedEventId: savedPinnedEvent.id,
      version: savedPinnedEvent.version,
      timelineVersion,
      ...savedPinnedEvent.attributes,
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

export const pickSavedPinnedEvent = (
  pinnedEventId: string | null,
  savedPinnedEvent: SavedPinnedEvent,
  userInfo: AuthenticatedUser | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  const dateNow = new Date().valueOf();
  if (pinnedEventId == null) {
    savedPinnedEvent.created = dateNow;
    savedPinnedEvent.createdBy = userInfo?.username ?? UNAUTHENTICATED_USER;
    savedPinnedEvent.updated = dateNow;
    savedPinnedEvent.updatedBy = userInfo?.username ?? UNAUTHENTICATED_USER;
  } else if (pinnedEventId != null) {
    savedPinnedEvent.updated = dateNow;
    savedPinnedEvent.updatedBy = userInfo?.username ?? UNAUTHENTICATED_USER;
  }
  return savedPinnedEvent;
};
