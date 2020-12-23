/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { timelineSelectors } from '../../../store/timeline';

export const getTimelineNoteSelector = () =>
  createSelector(timelineSelectors.selectTimeline, (timeline) => {
    return {
      createdBy: timeline.createdBy,
      expandedEvent: timeline.expandedEvent?.notes ?? {},
      eventIdToNoteIds: timeline?.eventIdToNoteIds ?? {},
      noteIds: timeline.noteIds,
      status: timeline.status,
    };
  });
