/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySubPluginWithStore } from '../app/types';
import { routes } from './routes';
import { initialTimelineState, timelineReducer } from './store/timeline/reducer';
import type { TimelineState } from './store/timeline/types';

export class Timelines {
  public setup() {}

  public start(): SecuritySubPluginWithStore<'timeline', TimelineState> {
    return {
      routes,
      store: {
        initialState: { timeline: initialTimelineState },
        reducer: { timeline: timelineReducer },
      },
    };
  }
}
