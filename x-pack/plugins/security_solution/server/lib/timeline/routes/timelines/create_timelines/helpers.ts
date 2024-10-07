/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

import moment from 'moment';
import { timeline as timelineLib, pinnedEvent as pinnedEventLib } from '../../../saved_object';
import type { FrameworkRequest } from '../../../../framework';
import type { SavedTimeline, Note } from '../../../../../../common/api/timeline';
import { persistNotes } from '../../../saved_object/notes/persist_notes';
import type { InternalTimelineResponse } from '../../../saved_object/timelines';

interface CreateTimelineProps {
  frameworkRequest: FrameworkRequest;
  timeline: SavedTimeline;
  timelineSavedObjectId?: string | null;
  timelineVersion?: string | null;
  overrideNotesOwner?: boolean;
  pinnedEventIds?: string[] | null;
  notes?: Note[];
  existingNoteIds?: string[] | null;
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
}: CreateTimelineProps): Promise<InternalTimelineResponse> => {
  const timerangeStart = isImmutable
    ? moment().subtract(24, 'hours').toISOString()
    : timeline.dateRange?.start;
  const timerangeEnd = isImmutable ? moment().toISOString() : timeline.dateRange?.end;
  const responseTimeline = await timelineLib.persistTimeline(
    frameworkRequest,
    timelineSavedObjectId,
    timelineVersion,
    { ...timeline, dateRange: { start: timerangeStart, end: timerangeEnd } },
    isImmutable
  );
  const newTimelineSavedObjectId = responseTimeline.timeline.savedObjectId;

  let myPromises: unknown[] = [];
  if (pinnedEventIds != null && !isEmpty(pinnedEventIds)) {
    myPromises = [
      ...myPromises,
      pinnedEventLib.savePinnedEvents(
        frameworkRequest,
        timelineSavedObjectId ?? newTimelineSavedObjectId,
        pinnedEventIds
      ),
    ];
  }
  if (!isEmpty(notes)) {
    myPromises = [
      ...myPromises,
      persistNotes(
        frameworkRequest,
        timelineSavedObjectId ?? newTimelineSavedObjectId,
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
