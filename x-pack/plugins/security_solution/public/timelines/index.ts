/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Reducer, AnyAction } from 'redux';
import reduceReducers from 'reduce-reducers';
import { SecuritySubPluginWithStore } from '../app/types';
import { TimelinesRoutes } from './routes';
import { initialTimelineState, timelineReducer } from './store/timeline/reducer';
import { TimelineState } from './store/timeline/types';

export class Timelines {
  public setup() {}

  public start(
    tGridReducer: Reducer<TimelineState, AnyAction>,
    tGridInitialState: TimelineState
  ): SecuritySubPluginWithStore<'timeline', TimelineState> {
    const combinedInitialState = {
      ...tGridInitialState,
      ...initialTimelineState,
    };
    const combinedReducer = reduceReducers(
      combinedInitialState,
      tGridReducer,
      timelineReducer
    ) as Reducer<TimelineState, AnyAction>;
    return {
      SubPluginRoutes: TimelinesRoutes,
      store: {
        initialState: { timeline: combinedInitialState },
        reducer: { timeline: combinedReducer },
      },
    };
  }
}
