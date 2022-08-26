/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineById } from '@kbn/timelines-plugin/public/types';
import { createSelector } from 'reselect';
import { TimelineModel } from '@kbn/security-solution-plugin/public';
import { State } from './types';

// Timeline selectors

const selectTimelineById = (state: State): TimelineById => state.timeline.timelineById;

export const timelineByIdSelector = createSelector(
  selectTimelineById,
  (timelineById) => timelineById
);

export const selectTimeline = (state: State, timelineId: string): TimelineModel =>
  state.timeline.timelineById[timelineId];

export const getTimelineByIdSelector = () => createSelector(selectTimeline, (timeline) => timeline);
