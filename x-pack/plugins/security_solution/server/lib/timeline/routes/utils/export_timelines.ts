/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';

import {
  SavedObjectsClient,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from '../../../../../../../../src/core/server';

import {
  ExportedTimelines,
  ExportTimelineSavedObjectsClient,
  ExportedNotes,
  TimelineSavedObject,
  ExportTimelineNotFoundError,
} from '../../../../../common/types/timeline';
import { NoteSavedObject } from '../../../../../common/types/timeline/note';
import { PinnedEventSavedObject } from '../../../../../common/types/timeline/pinned_event';

import { transformDataToNdjson } from '../../../../utils/read_stream/create_stream_from_ndjson';

import { convertSavedObjectToSavedPinnedEvent } from '../../../pinned_event/saved_object';
import { convertSavedObjectToSavedNote } from '../../../note/saved_object';
import { pinnedEventSavedObjectType } from '../../../pinned_event/saved_object_mappings';
import { noteSavedObjectType } from '../../../note/saved_object_mappings';

import { timelineSavedObjectType } from '../../saved_object_mappings';
import { convertSavedObjectToSavedTimeline } from '../../convert_saved_object_to_savedtimeline';

export type TimelineSavedObjectsClient = Pick<
  SavedObjectsClient,
  | 'get'
  | 'errors'
  | 'create'
  | 'bulkCreate'
  | 'delete'
  | 'find'
  | 'bulkGet'
  | 'update'
  | 'bulkUpdate'
>;

const getAllSavedPinnedEvents = (
  pinnedEventsSavedObjects: SavedObjectsFindResponse<PinnedEventSavedObject>
): PinnedEventSavedObject[] => {
  return pinnedEventsSavedObjects != null
    ? (pinnedEventsSavedObjects?.saved_objects ?? []).map((savedObject) =>
        convertSavedObjectToSavedPinnedEvent(savedObject)
      )
    : [];
};

const getPinnedEventsByTimelineId = (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  timelineId: string
): Promise<SavedObjectsFindResponse<PinnedEventSavedObject>> => {
  const options: SavedObjectsFindOptions = {
    type: pinnedEventSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  return savedObjectsClient.find(options);
};

const getAllSavedNote = (
  noteSavedObjects: SavedObjectsFindResponse<NoteSavedObject>
): NoteSavedObject[] => {
  return noteSavedObjects != null
    ? noteSavedObjects.saved_objects.map((savedObject) =>
        convertSavedObjectToSavedNote(savedObject)
      )
    : [];
};

const getNotesByTimelineId = (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  timelineId: string
): Promise<SavedObjectsFindResponse<NoteSavedObject>> => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };

  return savedObjectsClient.find(options);
};

const getGlobalEventNotesByTimelineId = (currentNotes: NoteSavedObject[]): ExportedNotes => {
  const initialNotes: ExportedNotes = {
    eventNotes: [],
    globalNotes: [],
  };

  return (
    currentNotes.reduce((acc, note) => {
      if (note.eventId == null) {
        return {
          ...acc,
          globalNotes: [...acc.globalNotes, note],
        };
      } else {
        return {
          ...acc,
          eventNotes: [...acc.eventNotes, note],
        };
      }
    }, initialNotes) ?? initialNotes
  );
};

const getPinnedEventsIdsByTimelineId = (
  currentPinnedEvents: PinnedEventSavedObject[]
): string[] => {
  return currentPinnedEvents.map((event) => event.eventId) ?? [];
};

const getTimelines = async (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  timelineIds: string[]
) => {
  const savedObjects = await Promise.resolve(
    savedObjectsClient.bulkGet(
      timelineIds.reduce(
        (acc, timelineId) => [...acc, { id: timelineId, type: timelineSavedObjectType }],
        [] as Array<{ id: string; type: string }>
      )
    )
  );

  const timelineObjects: {
    timelines: TimelineSavedObject[];
    errors: ExportTimelineNotFoundError[];
  } = savedObjects.saved_objects.reduce(
    (acc, savedObject) => {
      return savedObject.error == null
        ? {
            errors: acc.errors,
            timelines: [...acc.timelines, convertSavedObjectToSavedTimeline(savedObject)],
          }
        : { errors: [...acc.errors, savedObject.error], timelines: acc.timelines };
    },
    {
      timelines: [] as TimelineSavedObject[],
      errors: [] as ExportTimelineNotFoundError[],
    }
  );

  return timelineObjects;
};

const getTimelinesFromObjects = async (
  savedObjectsClient: ExportTimelineSavedObjectsClient,
  ids: string[]
): Promise<Array<ExportedTimelines | ExportTimelineNotFoundError>> => {
  const { timelines, errors } = await getTimelines(savedObjectsClient, ids);

  const [notes, pinnedEventIds] = await Promise.all([
    Promise.all(ids.map((timelineId) => getNotesByTimelineId(savedObjectsClient, timelineId))),
    Promise.all(
      ids.map((timelineId) => getPinnedEventsByTimelineId(savedObjectsClient, timelineId))
    ),
  ]);

  const myNotes = notes.reduce<NoteSavedObject[]>(
    (acc, note) => [...acc, ...getAllSavedNote(note)],
    []
  );

  const myPinnedEventIds = pinnedEventIds.reduce<PinnedEventSavedObject[]>(
    (acc, pinnedEventId) => [...acc, ...getAllSavedPinnedEvents(pinnedEventId)],
    []
  );

  const myResponse = ids.reduce<ExportedTimelines[]>((acc, timelineId) => {
    const myTimeline = timelines.find((t) => t.savedObjectId === timelineId);
    if (myTimeline != null) {
      const timelineNotes = myNotes.filter((n) => n.timelineId === timelineId);
      const timelinePinnedEventIds = myPinnedEventIds.filter((p) => p.timelineId === timelineId);
      const exportedTimeline = omit('status', myTimeline);
      return [
        ...acc,
        {
          ...exportedTimeline,
          ...getGlobalEventNotesByTimelineId(timelineNotes),
          pinnedEventIds: getPinnedEventsIdsByTimelineId(timelinePinnedEventIds),
        },
      ];
    }
    return acc;
  }, []);

  return [...myResponse, ...errors] ?? [];
};

export const getExportTimelineByObjectIds = async ({
  client,
  ids,
}: {
  client: ExportTimelineSavedObjectsClient;
  ids: string[];
}) => {
  const timeline = await getTimelinesFromObjects(client, ids);
  return transformDataToNdjson(timeline);
};
