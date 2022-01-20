/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

export { getManageTimelineById } from '../../../../../timelines/public';
import { State } from '../../../common/store/types';

import { TimelineModel } from './model';
import { AutoSavedWarningMsg, InsertTimeline, TimelineById } from './types';

const selectTimelineById = (state: State): TimelineById => state.timeline.timelineById;

const selectAutoSaveMsg = (state: State): AutoSavedWarningMsg => state.timeline.autoSavedWarningMsg;

const selectCallOutUnauthorizedMsg = (state: State): boolean =>
  state.timeline.showCallOutUnauthorizedMsg;

export const selectTimeline = (state: State, timelineId: string): TimelineModel =>
  state.timeline.timelineById[timelineId];

export const selectInsertTimeline = (state: State): InsertTimeline | null =>
  state.timeline.insertTimeline;

export const autoSaveMsgSelector = createSelector(selectAutoSaveMsg, (autoSaveMsg) => autoSaveMsg);

export const timelineByIdSelector = createSelector(
  selectTimelineById,
  (timelineById) => timelineById
);

export const getShowCallOutUnauthorizedMsg = () =>
  createSelector(
    selectCallOutUnauthorizedMsg,
    (showCallOutUnauthorizedMsg) => showCallOutUnauthorizedMsg
  );

export const getTimelines = () => timelineByIdSelector;

export const getTimelineByIdSelector = () => createSelector(selectTimeline, (timeline) => timeline);

export const getKqlFilterQuerySelector = () =>
  createSelector(selectTimeline, (timeline) =>
    timeline &&
    timeline.kqlQuery &&
    timeline.kqlQuery.filterQuery &&
    timeline.kqlQuery.filterQuery.kuery
      ? timeline.kqlQuery.filterQuery.kuery.expression
      : null
  );

export const getKqlFilterKuerySelector = () =>
  createSelector(selectTimeline, (timeline) =>
    timeline &&
    timeline.kqlQuery &&
    timeline.kqlQuery.filterQuery &&
    timeline.kqlQuery.filterQuery.kuery
      ? timeline.kqlQuery.filterQuery.kuery
      : null
  );
