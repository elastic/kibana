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
  timelineSavedObjectId?: string | null,
  timelineVersion?: string | null,
  isImmutable?: boolean
): Promise<ResponseTimeline> => {
  return timelineLib.persistTimeline(
    frameworkRequest,
    timelineSavedObjectId ?? null,
    timelineVersion ?? null,
    timeline,
    isImmutable
  );
};

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

const getNewNote = async (
  frameworkRequest: FrameworkRequest,
  note: NoteResult,
  timelineSavedObjectId: string,
  overrideOwner: boolean
): Promise<SavedNote> => {
  let savedNote = note;
  try {
    savedNote = await noteLib.getNote(frameworkRequest, note.noteId);
    // eslint-disable-next-line no-empty
  } catch (e) {}
  return overrideOwner
    ? {
        eventId: note.eventId,
        note: note.note,
        timelineId: timelineSavedObjectId,
      }
    : {
        eventId: savedNote.eventId,
        note: savedNote.note,
        created: savedNote.created,
        createdBy: savedNote.createdBy,
        updated: savedNote.updated,
        updatedBy: savedNote.updatedBy,
        timelineId: timelineSavedObjectId,
      };
};

export const saveNotes = async (
  frameworkRequest: FrameworkRequest,
  timelineSavedObjectId: string,
  timelineVersion?: string | null,
  existingNoteIds?: string[],
  newNotes?: NoteResult[],
  overrideOwner: boolean = true
) => {
  return Promise.all(
    newNotes?.map(async (note) => {
      const newNote = await getNewNote(
        frameworkRequest,
        note,
        timelineSavedObjectId,
        overrideOwner
      );
      return noteLib.persistNote(
        frameworkRequest,
        overrideOwner ? existingNoteIds?.find((nId) => nId === note.noteId) ?? null : null,
        timelineVersion ?? null,
        newNote,
        overrideOwner
      );
    }) ?? []
  );
};

interface CreateTimelineProps {
  frameworkRequest: FrameworkRequest;
  timeline: SavedTimeline;
  timelineSavedObjectId?: string | null;
  timelineVersion?: string | null;
  overrideNotesOwner?: boolean;
  pinnedEventIds?: string[] | null;
  notes?: NoteResult[];
  existingNoteIds?: string[];
  isImmutable?: boolean;
}

/** allow overrideNotesOwner means overriding by current username,
 * disallow overrideNotesOwner means keep the original username.
 * overrideNotesOwner = false only happens when import timeline templates,
 * as we want to keep the original creator for notes
 **/
export const createTimelines = async ({
  frameworkRequest,
  timeline,
  timelineSavedObjectId = null,
  timelineVersion = null,
  pinnedEventIds = null,
  notes = [],
  existingNoteIds = [],
  isImmutable,
  overrideNotesOwner = true,
}: CreateTimelineProps): Promise<ResponseTimeline> => {
  const responseTimeline = await saveTimelines(
    frameworkRequest,
    timeline,
    timelineSavedObjectId,
    timelineVersion,
    isImmutable
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
        notes,
        overrideNotesOwner
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
  } catch (e) {
    return null;
  }
  return templateTimeline?.timeline[0] ?? null;
};
