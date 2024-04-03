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

import type { SavedObjectsFindOptions } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { UNAUTHENTICATED_USER } from '../../../../../common/constants';
import type {
  BarePinnedEvent,
  PinnedEvent,
  PinnedEventResponse,
  BarePinnedEventWithoutExternalRefs,
} from '../../../../../common/api/timeline';
import { SavedObjectPinnedEventRuntimeType } from '../../../../../common/types/timeline/pinned_event/saved_object';
import type { SavedObjectPinnedEventWithoutExternalRefs } from '../../../../../common/types/timeline/pinned_event/saved_object';
import type { FrameworkRequest } from '../../../framework';

import { createTimeline } from '../timelines';
import { pinnedEventSavedObjectType } from '../../saved_object_mappings/pinned_events';
import { pinnedEventFieldsMigrator } from './field_migrator';
import { timelineSavedObjectType } from '../../saved_object_mappings';

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

export const PINNED_EVENTS_PER_PAGE = 10000; // overrides the saved object client's FIND_DEFAULT_PER_PAGE (20)

export const getAllPinnedEventsByTimelineId = async (
  request: FrameworkRequest,
  timelineId: string
): Promise<PinnedEvent[]> => {
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
      return { ...pinnedEvents[0], code: 200 };
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
            version: '',
            eventId: '',
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
): Promise<PinnedEvent[]> => {
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
}): Promise<PinnedEventResponse> => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;

  const savedPinnedEvent: BarePinnedEvent = {
    eventId,
    timelineId,
  };

  const pinnedEventWithCreator = pickSavedPinnedEvent(null, savedPinnedEvent, request.user);

  const { transformedFields: migratedAttributes, references } =
    pinnedEventFieldsMigrator.extractFieldsToReferences<BarePinnedEventWithoutExternalRefs>({
      data: pinnedEventWithCreator,
    });

  const pinnedEventAttributes: SavedObjectPinnedEventWithoutExternalRefs = {
    eventId: migratedAttributes.eventId,
    created: migratedAttributes.created,
    createdBy: migratedAttributes.createdBy,
    updated: migratedAttributes.updated,
    updatedBy: migratedAttributes.updatedBy,
  };

  const createdPinnedEvent =
    await savedObjectsClient.create<SavedObjectPinnedEventWithoutExternalRefs>(
      pinnedEventSavedObjectType,
      pinnedEventAttributes,
      { references }
    );

  const repopulatedSavedObject =
    pinnedEventFieldsMigrator.populateFieldsFromReferences(createdPinnedEvent);

  // create Pinned Event on Timeline
  return {
    ...convertSavedObjectToSavedPinnedEvent(repopulatedSavedObject, timelineVersion),
    code: 200,
  };
};

const getAllSavedPinnedEvents = async (
  request: FrameworkRequest,
  options: SavedObjectsFindOptions
) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const savedObjects = await savedObjectsClient.find<SavedObjectPinnedEventWithoutExternalRefs>(
    options
  );

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
): PinnedEvent =>
  pipe(
    SavedObjectPinnedEventRuntimeType.decode(savedObject),
    map((savedPinnedEvent) => {
      return {
        pinnedEventId: savedPinnedEvent.id,
        version: savedPinnedEvent.version,
        timelineVersion,
        timelineId: savedPinnedEvent.attributes.timelineId,
        created: savedPinnedEvent.attributes.created,
        createdBy: savedPinnedEvent.attributes.createdBy,
        eventId: savedPinnedEvent.attributes.eventId,
        updated: savedPinnedEvent.attributes.updated,
        updatedBy: savedPinnedEvent.attributes.updatedBy,
      };
    }),
    fold((errors) => {
      throw new Error(failure(errors).join('\n'));
    }, identity)
  );

export const pickSavedPinnedEvent = (
  pinnedEventId: string | null,
  savedPinnedEvent: BarePinnedEvent,
  userInfo: AuthenticatedUser | null
) => {
  const dateNow = new Date().valueOf();
  if (pinnedEventId == null) {
    savedPinnedEvent.created = dateNow;
    savedPinnedEvent.createdBy = userInfo?.username ?? UNAUTHENTICATED_USER;
  }

  savedPinnedEvent.updated = dateNow;
  savedPinnedEvent.updatedBy = userInfo?.username ?? UNAUTHENTICATED_USER;

  return savedPinnedEvent;
};
