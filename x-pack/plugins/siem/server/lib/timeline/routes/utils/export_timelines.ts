/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ExportedTimelines,
  ExportedNotes,
  ExportTimelineNotFoundError,
  TimelineStatus,
} from '../../../../../common/types/timeline';
import { NoteSavedObject } from '../../../../../common/types/timeline/note';
import { PinnedEventSavedObject } from '../../../../../common/types/timeline/pinned_event';

import { transformDataToNdjson } from '../../../../utils/read_stream/create_stream_from_ndjson';

import { FrameworkRequest } from '../../../framework';
import * as noteLib from '../../../note/saved_object';
import * as pinnedEventLib from '../../../pinned_event/saved_object';

import { getTimelines } from '../../saved_object';

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

const getTimelinesFromObjects = async (
  request: FrameworkRequest,
  ids: string[]
): Promise<Array<ExportedTimelines | ExportTimelineNotFoundError>> => {
  const { timelines, errors } = await getTimelines(request, ids);

  const [notes, pinnedEvents] = await Promise.all([
    Promise.all(ids.map((timelineId) => noteLib.getNotesByTimelineId(request, timelineId))),
    Promise.all(
      ids.map((timelineId) => pinnedEventLib.getAllPinnedEventsByTimelineId(request, timelineId))
    ),
  ]);

  const myNotes = notes.reduce<NoteSavedObject[]>((acc, note) => [...acc, ...note], []);

  const myPinnedEventIds = pinnedEvents.reduce<PinnedEventSavedObject[]>(
    (acc, pinnedEventId) => [...acc, ...pinnedEventId],
    []
  );

  const myResponse = ids.reduce<ExportedTimelines[]>((acc, timelineId) => {
    const myTimeline = timelines.find((t) => t.savedObjectId === timelineId);
    if (myTimeline != null) {
      const timelineNotes = myNotes.filter((n) => n.timelineId === timelineId);
      const timelinePinnedEventIds = myPinnedEventIds.filter((p) => p.timelineId === timelineId);
      return [
        ...acc,
        {
          ...myTimeline,
          status:
            myTimeline.status === TimelineStatus.draft ? TimelineStatus.active : myTimeline.status,
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
  frameworkRequest,
  ids,
}: {
  frameworkRequest: FrameworkRequest;
  ids: string[];
}) => {
  const timeline = await getTimelinesFromObjects(frameworkRequest, ids);
  return transformDataToNdjson(timeline);
};
