/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { isEmpty } from 'lodash/fp';
import {
  UNTITLED_TEMPLATE,
  UNTITLED_TIMELINE,
} from '../components/timeline/properties/translations';
import { timelineSelectors } from '.';
import { TimelineTabs } from '../../../common/types';
import type { State } from '../../common/store/types';

import type { TimelineModel } from './model';
import type { InsertTimeline, TimelineById } from './types';
import { TimelineStatus, TimelineType } from '../../../common/api/timeline';

export const getTimelineShowStatusByIdSelector = () =>
  createSelector(timelineSelectors.selectTimeline, (timeline) => ({
    activeTab: timeline?.activeTab ?? TimelineTabs.query,
    status: timeline?.status ?? TimelineStatus.draft,
    show: timeline?.show ?? false,
    updated: timeline?.updated ?? undefined,
    changed: timeline?.changed ?? false,
  }));

/**
 * @deprecated
 */
const timelineByIdState = (state: State): TimelineById => state.timeline.timelineById;

const selectCallOutUnauthorizedMsg = (state: State): boolean =>
  state.timeline.showCallOutUnauthorizedMsg;

/**
 * @deprecated prefer using selectTimelineById below
 */
export const selectTimeline = (state: State, timelineId: string): TimelineModel =>
  state.timeline.timelineById[timelineId];

export const selectInsertTimeline = (state: State): InsertTimeline | null =>
  state.timeline.insertTimeline;

/**
 * @deprecated prefer using selectTimelineById below
 */
export const timelineByIdSelector = createSelector(
  timelineByIdState,
  (timelineById) => timelineById
);

export const getShowCallOutUnauthorizedMsg = () =>
  createSelector(
    selectCallOutUnauthorizedMsg,
    (showCallOutUnauthorizedMsg) => showCallOutUnauthorizedMsg
  );

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

export const dataProviderVisibilitySelector = () =>
  createSelector(selectTimeline, (timeline) => timeline.isDataProviderVisible);

/**
 * Selector that returns the timelineById slice of state
 */
export const selectTimelineById = createSelector(
  (state: State) => state.timeline.timelineById,
  (state: State, timelineId: string) => timelineId,
  (timelineById, timelineId) => timelineById[timelineId]
);

/**
 * Selector that returns the timeline saved title.
 */
const selectTimelineTitle = createSelector(selectTimelineById, (timeline) => timeline?.title);

/**
 * Selector that returns the timeline type.
 */
const selectTimelineTimelineType = createSelector(
  selectTimelineById,
  (timeline) => timeline?.timelineType
);

/**
 * Selector that returns the title of a timeline.
 * If the timeline has been saved, it will return the saved title.
 * If timeline is in template mode, it will return the default 'Untitled template' value;
 * If none of the above, it will return the default 'Untitled timeline' value.
 */
export const selectTitleByTimelineById = createSelector(
  selectTimelineTitle,
  selectTimelineTimelineType,
  (savedTitle, timelineType): string => {
    if (!isEmpty(savedTitle)) {
      return savedTitle;
    }
    if (timelineType === TimelineType.template) {
      return UNTITLED_TEMPLATE;
    }
    return UNTITLED_TIMELINE;
  }
);
