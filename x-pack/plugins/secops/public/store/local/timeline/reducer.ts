/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import { createTimeline } from './actions';
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

/** The reducer for all timeline actions  */
export const timelineReducer = reducerWithInitialState(initialTimelineState)
  .case(createTimeline, (state, { id }) => ({
    ...state,
    timelineById: addNewTimeline({ id, timelineById: state.timelineById }),
  }))
  .build();
