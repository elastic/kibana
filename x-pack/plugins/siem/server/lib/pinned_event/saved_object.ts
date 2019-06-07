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
import { FrameworkRequest, internalFrameworkRequest } from '../framework';
import {
  PinnedEventSavedObject,
  PinnedEventSavedObjectRuntimeType,
  SavedPinnedEvent,
} from './types';
import { PageInfoNote, SortNote } from '../../graphql/types';
import { pinnedEventSavedObjectType, timelineSavedObjectType } from '../../saved_objects';
import { pickSavedTimeline } from '../timeline/pick_saved_timeline';
import { convertSavedObjectToSavedTimeline } from '../timeline/convert_saved_object_to_savedtimeline';

export class PinnedEvent {
  constructor(
    private readonly libs: {
      savedObjects: Pick<Legacy.SavedObjectsService, 'getScopedSavedObjectsClient'> &
        Pick3<Legacy.SavedObjectsService, 'SavedObjectsClient', 'errors', 'isConflictError'>;
    }
  ) {}

  public async deletePinnedEventOnTimeline(request: FrameworkRequest, pinnedEventIds: string[]) {
    await Promise.all(
      pinnedEventIds.map(pinnedEventId =>
        this.libs.savedObjects
          .getScopedSavedObjectsClient(request[internalFrameworkRequest])
          .delete(pinnedEventSavedObjectType, pinnedEventId)
      )
    );
  }

  public async deleteAllPinnedEventsOnTimeline(request: FrameworkRequest, timelineId: string) {
    const options: FindOptions = {
      search: timelineId,
      searchFields: ['timelineId'],
    };
    const pinnedEventToBeDeleted = await this.getAllSavedPinnedEvents(request, options);
    await Promise.all(
      pinnedEventToBeDeleted.map(pinnedEvent =>
        this.libs.savedObjects
          .getScopedSavedObjectsClient(request[internalFrameworkRequest])
          .delete(pinnedEventSavedObjectType, pinnedEvent.pinnedEventId)
      )
    );
  }

  public async getPinnedEvent(
    request: FrameworkRequest,
    pinnedEventId: string
  ): Promise<PinnedEventSavedObject> {
    return await this.getSavedPinnedEvent(request, pinnedEventId);
  }

  public async getAllPinnedEventsByTimelineId(
    request: FrameworkRequest,
    timelineId: string
  ): Promise<PinnedEventSavedObject[]> {
    const options: FindOptions = {
      search: timelineId,
      searchFields: ['timelineId'],
    };
    return await this.getAllSavedPinnedEvents(request, options);
  }

  public async getAllPinnedEvents(
    request: FrameworkRequest,
    pageInfo: PageInfoNote | null,
    search: string | null,
    sort: SortNote | null
  ): Promise<PinnedEventSavedObject[]> {
    const options: FindOptions = {
      perPage: pageInfo != null ? pageInfo.pageSize : undefined,
      page: pageInfo != null ? pageInfo.pageIndex : undefined,
      search: search != null ? search : undefined,
      searchFields: ['timelineId', 'eventId'],
      sortField: sort != null ? sort.sortField : undefined,
      sortOrder: sort != null ? sort.sortOrder : undefined,
    };
    return await this.getAllSavedPinnedEvents(request, options);
  }

  public async persistPinnedEventOnTimeline(
    request: FrameworkRequest,
    pinnedEventId: string | null,
    eventId: string,
    timelineId: string | null
  ): Promise<PinnedEventSavedObject | null> {
    let timelineVersionSavedObject = null;
    try {
      if (timelineId == null) {
        const timelineResult = convertSavedObjectToSavedTimeline(
          await this.libs.savedObjects
            .getScopedSavedObjectsClient(request[internalFrameworkRequest])
            .create(
              timelineSavedObjectType,
              pickSavedTimeline(null, {}, request[internalFrameworkRequest].auth || null)
            )
        );
        timelineId = timelineResult.savedObjectId;
        timelineVersionSavedObject = timelineResult.version;
      }
      if (pinnedEventId == null) {
        const allPinnedEventId = await this.getAllPinnedEventsByTimelineId(request, timelineId);
        const isPinnedAlreadyExisting = allPinnedEventId.filter(
          pinnedEvent => pinnedEvent.eventId === eventId
        );
        if (isPinnedAlreadyExisting.length === 0) {
          const savedPinnedEvent: SavedPinnedEvent = {
            eventId,
            timelineId,
          };
          // create Pinned Event on Timeline
          return convertSavedObjectToSavedPinnedEvent(
            await this.libs.savedObjects
              .getScopedSavedObjectsClient(request[internalFrameworkRequest])
              .create(
                pinnedEventSavedObjectType,
                pickSavedPinnedEvent(
                  pinnedEventId,
                  savedPinnedEvent,
                  request[internalFrameworkRequest].auth || null
                )
              ),
            timelineVersionSavedObject != null ? timelineVersionSavedObject : undefined
          );
        }
        return isPinnedAlreadyExisting[0];
      }
      // Delete Pinned Event on Timeline
      await this.deletePinnedEventOnTimeline(request, [pinnedEventId]);
      return null;
    } catch (err) {
      throw err;
    }
  }

  private async getSavedPinnedEvent(request: FrameworkRequest, pinnedEventId: string) {
    const savedObjectsClient = this.libs.savedObjects.getScopedSavedObjectsClient(
      request[internalFrameworkRequest]
    );

    const savedObject = await savedObjectsClient.get(pinnedEventSavedObjectType, pinnedEventId);

    return convertSavedObjectToSavedPinnedEvent(savedObject);
  }

  private async getAllSavedPinnedEvents(request: FrameworkRequest, options: FindOptions) {
    const savedObjectsClient = this.libs.savedObjects.getScopedSavedObjectsClient(
      request[internalFrameworkRequest]
    );

    const savedObjects = await savedObjectsClient.find({
      type: pinnedEventSavedObjectType,
      ...options,
    });

    return savedObjects.saved_objects.map(savedObject =>
      convertSavedObjectToSavedPinnedEvent(savedObject)
    );
  }
}

const convertSavedObjectToSavedPinnedEvent = (
  savedObject: unknown,
  timelineVersion?: string | undefined | null
): PinnedEventSavedObject =>
  PinnedEventSavedObjectRuntimeType.decode(savedObject)
    .map(savedPinnedEvent => ({
      pinnedEventId: savedPinnedEvent.id,
      version: savedPinnedEvent.version,
      timelineVersion,
      ...savedPinnedEvent.attributes,
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

const pickSavedPinnedEvent = (
  pinnedEventId: string | null,
  savedPinnedEvent: SavedPinnedEvent,
  userInfo: RequestAuth
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  if (pinnedEventId == null) {
    savedPinnedEvent.created = new Date().valueOf();
    savedPinnedEvent.createdBy = getOr(null, 'credentials.username', userInfo);
    savedPinnedEvent.updated = new Date().valueOf();
    savedPinnedEvent.updatedBy = getOr(null, 'credentials.username', userInfo);
  } else if (pinnedEventId != null) {
    savedPinnedEvent.updated = new Date().valueOf();
    savedPinnedEvent.updatedBy = getOr(null, 'credentials.username', userInfo);
  }
  return savedPinnedEvent;
};
