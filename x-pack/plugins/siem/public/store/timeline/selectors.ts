/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { isFromKueryExpressionValid } from '../../lib/keury';
import { State } from '../reducer';

import { timelineDefaults, TimelineModel } from './model';
import { TimelineById } from './reducer';

const selectTimelineById = (state: State): TimelineById => state.timeline.timelineById;

export const selectTimeline = (state: State, timelineId: string): TimelineModel =>
  state.timeline.timelineById[timelineId];

export const timelineByIdSelector = createSelector(
  selectTimelineById,
  timelineById => timelineById
);

export const getTimelineByIdSelector = () =>
  createSelector(
    selectTimeline,
    timeline => timeline || timelineDefaults
  );

export const getKqlFilterQuerySelector = () =>
  createSelector(
    selectTimeline,
    timeline =>
      timeline && timeline.kqlQuery && timeline.kqlQuery.filterQuery
        ? timeline.kqlQuery.filterQuery.query.expression
        : null
  );

export const getKqlFilterQueryDraftSelector = () =>
  createSelector(
    selectTimeline,
    timeline => (timeline && timeline.kqlQuery ? timeline.kqlQuery.filterQueryDraft : null)
  );

export const isFilterQueryDraftValidSelector = () =>
  createSelector(
    selectTimeline,
    timeline =>
      timeline &&
      timeline.kqlQuery &&
      isFromKueryExpressionValid(timeline.kqlQuery.filterQueryDraft)
  );
