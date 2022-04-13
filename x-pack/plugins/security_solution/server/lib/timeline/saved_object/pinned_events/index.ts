/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { failure } from 'io-ts/lib/PathReporter';
import { getOr } from 'lodash/fp';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { SavedObjectsFindOptions } from '../../../../../../../../src/core/server';
import { AuthenticatedUser } from '../../../../../../security/common/model';
import { UNAUTHENTICATED_USER } from '../../../../../common/constants';
import {
  PinnedEventSavedObject,
  PinnedEventSavedObjectRuntimeType,
  SavedPinnedEvent,
  PinnedEvent as PinnedEventResponse,
  PinnedEventWithoutExternalRefs,
} from '../../../../../common/types/timeline/pinned_event';
import { FrameworkRequest } from '../../../framework';

import { createTimeline } from '../../saved_object/timelines';
import { pinnedEventSavedObjectType } from '../../saved_object_mappings/pinned_events';
import { pinnedEventFieldsMigrator } from './field_migrator';
import { timelineSavedObjectType } from '../../saved_object_mappings';

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
  const savedObjectsClient = (await request.context.core).savedObjects.client;

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
  const savedObjectsClient = (await request.context.core).savedObjects.client;
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

export const PINNED_EVENTS_PER_PAGE = 10000; // overrides the saved object client's FIND_DEFAULT_PER_PAGE (20)

export const getAllPinnedEventsByTimelineId = async (
  request: FrameworkRequest,
  timelineId: string
): Promise<PinnedEventSavedObject[]> => {
  const options: SavedObjectsFindOptions = {
    type: pinnedEventSavedObjectType,
    hasReference: { type: timelineSavedObjectType, id: timelineId },
    perPage: PINNED_EVENTS_PER_PAGE,
  };
  return getAllSavedPinnedEvents(request, options);
};

export const persistPinnedEventOnTimeline = async (
  request: FrameworkRequest,
  pinnedEventId: string | null, // pinned event saved object id
  eventId: string,
  timelineId: string | null
): Promise<PinnedEventResponse | null> => {
  try {
    if (pinnedEventId != null) {
      // Delete Pinned Event on Timeline
      await deletePinnedEventOnTimeline(request, [pinnedEventId]);
      return null;
    }

    const { timelineId: validatedTimelineId, timelineVersion } = await getValidTimelineIdAndVersion(
      request,
      timelineId
    );

    const pinnedEvents = await getPinnedEventsInTimelineWithEventId(
      request,
      validatedTimelineId,
      eventId
    );

    // we already had this event pinned so let's just return the one we already had
    if (pinnedEvents.length > 0) {
      return pinnedEvents[0];
    }

    return await createPinnedEvent({
      request,
      eventId,
      timelineId: validatedTimelineId,
      timelineVersion,
    });
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

const getValidTimelineIdAndVersion = async (
  request: FrameworkRequest,
  timelineId: string | null
): Promise<{ timelineId: string; timelineVersion?: string }> => {
  if (timelineId != null) {
    return {
      timelineId,
    };
  }

  const savedObjectsClient = (await request.context.core).savedObjects.client;

  // create timeline because it didn't exist
  const { timeline: timelineResult } = await createTimeline({
    timelineId: null,
    timeline: {},
    savedObjectsClient,
    userInfo: request.user,
  });

  return {
    timelineId: timelineResult.savedObjectId,
    timelineVersion: timelineResult.version,
  };
};

const getPinnedEventsInTimelineWithEventId = async (
  request: FrameworkRequest,
  timelineId: string,
  eventId: string
): Promise<PinnedEventSavedObject[]> => {
  const allPinnedEventId = await getAllPinnedEventsByTimelineId(request, timelineId);
  const pinnedEvents = allPinnedEventId.filter((pinnedEvent) => pinnedEvent.eventId === eventId);

  return pinnedEvents;
};

const createPinnedEvent = async ({
  request,
  eventId,
  timelineId,
  timelineVersion,
}: {
  request: FrameworkRequest;
  eventId: string;
  timelineId: string;
  timelineVersion?: string;
}) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;

  const savedPinnedEvent: SavedPinnedEvent = {
    eventId,
    timelineId,
  };

  const pinnedEventWithCreator = pickSavedPinnedEvent(null, savedPinnedEvent, request.user);

  const { transformedFields: migratedAttributes, references } =
    pinnedEventFieldsMigrator.extractFieldsToReferences<PinnedEventWithoutExternalRefs>({
      data: pinnedEventWithCreator,
    });

  const createdPinnedEvent = await savedObjectsClient.create<PinnedEventWithoutExternalRefs>(
    pinnedEventSavedObjectType,
    migratedAttributes,
    { references }
  );

  const repopulatedSavedObject =
    pinnedEventFieldsMigrator.populateFieldsFromReferences(createdPinnedEvent);

  // create Pinned Event on Timeline
  return convertSavedObjectToSavedPinnedEvent(repopulatedSavedObject, timelineVersion);
};

const getSavedPinnedEvent = async (request: FrameworkRequest, pinnedEventId: string) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const savedObject = await savedObjectsClient.get<PinnedEventWithoutExternalRefs>(
    pinnedEventSavedObjectType,
    pinnedEventId
  );

  const populatedPinnedEvent = pinnedEventFieldsMigrator.populateFieldsFromReferences(savedObject);

  return convertSavedObjectToSavedPinnedEvent(populatedPinnedEvent);
};

const getAllSavedPinnedEvents = async (
  request: FrameworkRequest,
  options: SavedObjectsFindOptions
) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const savedObjects = await savedObjectsClient.find<PinnedEventWithoutExternalRefs>(options);

  return savedObjects.saved_objects.map((savedObject) => {
    const populatedPinnedEvent =
      pinnedEventFieldsMigrator.populateFieldsFromReferences(savedObject);

    return convertSavedObjectToSavedPinnedEvent(populatedPinnedEvent);
  });
};

export const savePinnedEvents = (
  frameworkRequest: FrameworkRequest,
  timelineSavedObjectId: string,
  pinnedEventIds: string[]
) =>
  Promise.all(
    pinnedEventIds.map((eventId) =>
      persistPinnedEventOnTimeline(
        frameworkRequest,
        null, // pinnedEventSavedObjectId
        eventId,
        timelineSavedObjectId
      )
    )
  );

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
  }

  savedPinnedEvent.updated = dateNow;
  savedPinnedEvent.updatedBy = userInfo?.username ?? UNAUTHENTICATED_USER;

  return savedPinnedEvent;
};
