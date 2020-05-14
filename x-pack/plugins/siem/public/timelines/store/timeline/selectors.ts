/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { isFromKueryExpressionValid } from '../../../common/lib/keury';
import { State } from '../../../common/store/reducer';

import { TimelineModel } from './model';
import { AutoSavedWarningMsg, TimelineById } from './types';

const selectTimelineById = (state: State): TimelineById => state.timeline.timelineById;

const selectAutoSaveMsg = (state: State): AutoSavedWarningMsg => state.timeline.autoSavedWarningMsg;

const selectCallOutUnauthorizedMsg = (state: State): boolean =>
  state.timeline.showCallOutUnauthorizedMsg;

export const selectTimeline = (state: State, timelineId: string): TimelineModel =>
  state.timeline.timelineById[timelineId];

export const autoSaveMsgSelector = createSelector(selectAutoSaveMsg, autoSaveMsg => autoSaveMsg);

export const timelineByIdSelector = createSelector(
  selectTimelineById,
  timelineById => timelineById
);

export const getShowCallOutUnauthorizedMsg = () =>
  createSelector(
    selectCallOutUnauthorizedMsg,
    showCallOutUnauthorizedMsg => showCallOutUnauthorizedMsg
  );

export const getTimelines = () => timelineByIdSelector;

export const getTimelineByIdSelector = () => createSelector(selectTimeline, timeline => timeline);

export const getEventsByIdSelector = () => createSelector(selectTimeline, timeline => timeline);

export const getKqlFilterQuerySelector = () =>
  createSelector(selectTimeline, timeline =>
    timeline &&
    timeline.kqlQuery &&
    timeline.kqlQuery.filterQuery &&
    timeline.kqlQuery.filterQuery.kuery
      ? timeline.kqlQuery.filterQuery.kuery.expression
      : null
  );

export const getKqlFilterQueryDraftSelector = () =>
  createSelector(selectTimeline, timeline =>
    timeline && timeline.kqlQuery ? timeline.kqlQuery.filterQueryDraft : null
  );

export const getKqlFilterKuerySelector = () =>
  createSelector(selectTimeline, timeline =>
    timeline &&
    timeline.kqlQuery &&
    timeline.kqlQuery.filterQuery &&
    timeline.kqlQuery.filterQuery.kuery
      ? timeline.kqlQuery.filterQuery.kuery
      : null
  );

export const isFilterQueryDraftValidSelector = () =>
  createSelector(
    selectTimeline,
    timeline =>
      timeline &&
      timeline.kqlQuery &&
      isFromKueryExpressionValid(timeline.kqlQuery.filterQueryDraft)
  );
