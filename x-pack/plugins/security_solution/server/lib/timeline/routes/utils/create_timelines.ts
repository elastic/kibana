/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty } from 'lodash/fp';

import * as timelineLib from '../../saved_object';
import * as pinnedEventLib from '../../../pinned_event/saved_object';
import * as noteLib from '../../../note/saved_object';
import { FrameworkRequest } from '../../../framework';
import { SavedTimeline, TimelineSavedObject } from '../../../../../common/types/timeline';
import { SavedNote } from '../../../../../common/types/timeline/note';
import { NoteResult, ResponseTimeline } from '../../../../graphql/types';

export const saveTimelines = (
  frameworkRequest: FrameworkRequest,
  timeline: SavedTimeline,
  timelineSavedObjectId: string | null = null,
  timelineVersion: string | null = null
): Promise<ResponseTimeline> =>
  timelineLib.persistTimeline(frameworkRequest, timelineSavedObjectId, timelineVersion, timeline);

export const savePinnedEvents = (
  frameworkRequest: FrameworkRequest,
  timelineSavedObjectId: string,
  pinnedEventIds: string[]
) =>
  Promise.all(
    pinnedEventIds.map((eventId) =>
      pinnedEventLib.persistPinnedEventOnTimeline(
        frameworkRequest,
        null, // pinnedEventSavedObjectId
        eventId,
        timelineSavedObjectId
      )
    )
  );

export const saveNotes = (
  frameworkRequest: FrameworkRequest,
  timelineSavedObjectId: string,
  timelineVersion?: string | null,
  existingNoteIds?: string[],
  newNotes?: NoteResult[]
) => {
  return Promise.all(
    newNotes?.map((note) => {
      const newNote: SavedNote = {
        eventId: note.eventId,
        note: note.note,
        timelineId: timelineSavedObjectId,
      };

      return noteLib.persistNote(
        frameworkRequest,
        existingNoteIds?.find((nId) => nId === note.noteId) ?? null,
        timelineVersion ?? null,
        newNote
      );
    }) ?? []
  );
};

interface CreateTimelineProps {
  frameworkRequest: FrameworkRequest;
  timeline: SavedTimeline;
  timelineSavedObjectId?: string | null;
  timelineVersion?: string | null;
  pinnedEventIds?: string[] | null;
  notes?: NoteResult[];
  existingNoteIds?: string[];
}

export const createTimelines = async ({
  frameworkRequest,
  timeline,
  timelineSavedObjectId = null,
  timelineVersion = null,
  pinnedEventIds = null,
  notes = [],
  existingNoteIds = [],
}: CreateTimelineProps): Promise<ResponseTimeline> => {
  const responseTimeline = await saveTimelines(
    frameworkRequest,
    timeline,
    timelineSavedObjectId,
    timelineVersion
  );
  const newTimelineSavedObjectId = responseTimeline.timeline.savedObjectId;
  const newTimelineVersion = responseTimeline.timeline.version;
  let myPromises: unknown[] = [];
  if (pinnedEventIds != null && !isEmpty(pinnedEventIds)) {
    myPromises = [
      ...myPromises,
      savePinnedEvents(
        frameworkRequest,
        timelineSavedObjectId ?? newTimelineSavedObjectId,
        pinnedEventIds
      ),
    ];
  }
  if (!isEmpty(notes)) {
    myPromises = [
      ...myPromises,
      saveNotes(
        frameworkRequest,
        timelineSavedObjectId ?? newTimelineSavedObjectId,
        newTimelineVersion,
        existingNoteIds,
        notes
      ),
    ];
  }

  if (myPromises.length > 0) {
    await Promise.all(myPromises);
  }

  return responseTimeline;
};

export const getTimeline = async (
  frameworkRequest: FrameworkRequest,
  savedObjectId: string
): Promise<TimelineSavedObject | null> => {
  let timeline = null;
  try {
    timeline = await timelineLib.getTimeline(frameworkRequest, savedObjectId);
    // eslint-disable-next-line no-empty
  } catch (e) {}
  return timeline;
};

export const getTemplateTimeline = async (
  frameworkRequest: FrameworkRequest,
  templateTimelineId: string
): Promise<TimelineSavedObject | null> => {
  let templateTimeline = null;
  try {
    templateTimeline = await timelineLib.getTimelineByTemplateTimelineId(
      frameworkRequest,
      templateTimelineId
    );
    // eslint-disable-next-line no-empty
  } catch (e) {
    return null;
  }
  return templateTimeline?.timeline[0] ?? null;
};
