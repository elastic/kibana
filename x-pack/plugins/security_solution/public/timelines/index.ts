/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecuritySubPluginWithStore } from '../app/types';
import { TimelinesRoutes } from './routes';
import { initialTimelineState, timelineReducer } from './store/timeline/reducer';
import { TimelineState } from './store/timeline/types';

export class Timelines {
  public setup() {}

  public start(): SecuritySubPluginWithStore<'timeline', TimelineState> {
    return {
      SubPluginRoutes: TimelinesRoutes,
      store: {
        initialState: { timeline: initialTimelineState },
        reducer: { timeline: timelineReducer },
      },
    };
  }
}
