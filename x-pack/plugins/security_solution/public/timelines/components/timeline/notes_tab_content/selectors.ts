/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { timelineSelectors } from '../../../store';

export const getTimelineNoteSelector = () =>
  createSelector(timelineSelectors.selectTimeline, (timeline) => {
    return {
      createdBy: timeline.createdBy,
      expandedDetail: timeline.expandedDetail ?? {},
      eventIdToNoteIds: timeline?.eventIdToNoteIds ?? {},
      noteIds: timeline.noteIds,
      status: timeline.status,
    };
  });
