/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pinnedEventSavedObjectType } from '../../saved_object_mappings';
import { convertSavedObjectToSavedPinnedEvent } from '../../saved_object';
import {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
} from '../../../../../../../../src/core/server';

export const getAllSavedPinnedEvents = async (
  savedObjectsClient: SavedObjectsClientContract,
  options: SavedObjectsFindOptions
) => {
  const savedObjects = await savedObjectsClient.find(options);

  return savedObjects.saved_objects.map(savedObject =>
    convertSavedObjectToSavedPinnedEvent(savedObject)
  );
};

export const deleteAllPinnedEventsOnTimeline = async (
  savedObjectsClient: SavedObjectsClientContract,
  timelineId: string
) => {
  const options: SavedObjectsFindOptions = {
    type: pinnedEventSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  const pinnedEventToBeDeleted = await getAllSavedPinnedEvents(savedObjectsClient, options);

  await Promise.all(
    pinnedEventToBeDeleted.map(pinnedEvent =>
      savedObjectsClient.delete(pinnedEventSavedObjectType, pinnedEvent.pinnedEventId)
    )
  );
};
