/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import { filter } from 'lodash/fp';
import { Range } from '../../../components/timeline/body/column_headers/range_picker/ranges';
import { Sort } from '../../../components/timeline/body/sort';
import { ECS } from '../../../components/timeline/ecs';
import { createTimeline, removeProvider, updateData, updateRange, updateSort } from './actions';
import { timelineDefaults, TimelineModel } from './model';

/** A map of id to timeline  */
export interface TimelineById {
  [id: string]: TimelineModel;
}

/** The state of all timelines is stored here */
export interface TimelineState {
  timelineById: TimelineById;
}

const EMPTY_TIMELINE_BY_ID: TimelineById = {}; // stable reference

export const initialTimelineState: TimelineState = {
  timelineById: EMPTY_TIMELINE_BY_ID,
};

interface AddNewTimelineParams {
  id: string;
  timelineById: TimelineById;
}
/** Adds a new `Timeline` to the provided collection of `TimelineById` */
const addNewTimeline = ({ id, timelineById }: AddNewTimelineParams): TimelineById => ({
  ...timelineById,
  [id]: {
    id,
    ...timelineDefaults,
  },
});

interface UpdateTimelineDataParams {
  id: string;
  data: ECS[];
  timelineById: TimelineById;
}

const updateTimelineData = ({ id, data, timelineById }: UpdateTimelineDataParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      data,
    },
  };
};

interface UpdateTimelineRangeParams {
  id: string;
  range: Range;
  timelineById: TimelineById;
}

const updateTimelineRange = ({
  id,
  range,
  timelineById,
}: UpdateTimelineRangeParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      range,
    },
  };
};

interface UpdateTimelineSortParams {
  id: string;
  sort: Sort;
  timelineById: TimelineById;
}

const updateTimelineSort = ({ id, sort, timelineById }: UpdateTimelineSortParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      sort,
    },
  };
};

interface RemoveTimelineProviderParams {
  id: string;
  providerId: string;
  timelineById: TimelineById;
}

const removeTimelineProvider = ({
  id,
  providerId,
  timelineById,
}: RemoveTimelineProviderParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: filter(p => p.id !== providerId, timeline.dataProviders),
    },
  };
};

/** The reducer for all timeline actions  */
export const timelineReducer = reducerWithInitialState(initialTimelineState)
  .case(createTimeline, (state, { id }) => ({
    ...state,
    timelineById: addNewTimeline({ id, timelineById: state.timelineById }),
  }))
  .case(removeProvider, (state, { id, providerId }) => ({
    ...state,
    timelineById: removeTimelineProvider({ id, providerId, timelineById: state.timelineById }),
  }))
  .case(updateData, (state, { id, data }) => ({
    ...state,
    timelineById: updateTimelineData({ id, data, timelineById: state.timelineById }),
  }))
  .case(updateRange, (state, { id, range }) => ({
    ...state,
    timelineById: updateTimelineRange({ id, range, timelineById: state.timelineById }),
  }))
  .case(updateSort, (state, { id, sort }) => ({
    ...state,
    timelineById: updateTimelineSort({ id, sort, timelineById: state.timelineById }),
  }))
  .build();
