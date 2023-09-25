/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';

import type {
  ExportedTimelines,
  ExportedNotes,
  ExportTimelineNotFoundError,
  Note,
  PinnedEvent,
} from '../../../../../../common/api/timeline';

import type { FrameworkRequest } from '../../../../framework';
import * as noteLib from '../../../saved_object/notes';
import * as pinnedEventLib from '../../../saved_object/pinned_events';

import { getSelectedTimelines } from '../../../saved_object/timelines';

const getGlobalEventNotesByTimelineId = (currentNotes: Note[]): ExportedNotes => {
  const initialNotes: ExportedNotes = {
    eventNotes: [],
    globalNotes: [],
  };

  return currentNotes.reduce((acc, note) => {
    if (note.eventId == null) {
      acc.globalNotes.push(note);
    } else {
      acc.eventNotes.push(note);
    }
    return acc;
  }, initialNotes);
};

const getPinnedEventsIdsByTimelineId = (currentPinnedEvents: PinnedEvent[]): string[] => {
  return currentPinnedEvents.map((event) => event.eventId) ?? [];
};

const getTimelinesFromObjects = async (
  request: FrameworkRequest,
  ids?: string[] | null
): Promise<Array<ExportedTimelines | ExportTimelineNotFoundError>> => {
  const { timelines, errors } = await getSelectedTimelines(request, ids);
  const exportedIds = timelines.map((t) => t.savedObjectId);

  const [notes, pinnedEvents] = await Promise.all([
    Promise.all(exportedIds.map((timelineId) => noteLib.getNotesByTimelineId(request, timelineId))),
    Promise.all(
      exportedIds.map((timelineId) =>
        pinnedEventLib.getAllPinnedEventsByTimelineId(request, timelineId)
      )
    ),
  ]);

  const myNotes = notes.reduce<Note[]>((acc, note) => [...acc, ...note], []);

  const myPinnedEventIds = pinnedEvents.reduce<PinnedEvent[]>(
    (acc, pinnedEventId) => [...acc, ...pinnedEventId],
    []
  );

  const myResponse = exportedIds.reduce<ExportedTimelines[]>((acc, timelineId) => {
    const myTimeline = timelines.find((t) => t.savedObjectId === timelineId);
    if (myTimeline != null) {
      const timelineNotes = myNotes.filter((n) => n.timelineId === timelineId);
      const timelinePinnedEventIds = myPinnedEventIds.filter((p) => p.timelineId === timelineId);
      const exportedTimeline = omit(['status', 'excludedRowRendererIds'], myTimeline);
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
  frameworkRequest,
  ids,
}: {
  frameworkRequest: FrameworkRequest;
  ids?: string[] | null;
}) => {
  const timeline = await getTimelinesFromObjects(frameworkRequest, ids);
  return transformDataToNdjson(timeline);
};
