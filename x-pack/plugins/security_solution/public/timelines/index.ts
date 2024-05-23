/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TIMELINES_PATH } from '../../common/constants';
import type { SecuritySubPluginWithStore } from '../app/types';
import { withSubPluginRouteSuspense } from '../common/components/with_sub_plugin_route_suspense';
import { initialTimelineState, timelineReducer } from './store/reducer';
import type { TimelineState } from './store/types';

const TimelinesRoutesLazy = React.lazy(() =>
  import(
    /* webpackChunkName: "sub_plugin-timeline" */
    './routes'
  ).then(({ TimelinesRoutes }) => ({ default: TimelinesRoutes }))
);

export class Timelines {
  public setup() {}

  public start(): SecuritySubPluginWithStore<'timeline', TimelineState> {
    return {
      store: {
        initialState: { timeline: initialTimelineState },
        reducer: { timeline: timelineReducer },
      },
      routes: [
        {
          path: TIMELINES_PATH,
          component: withSubPluginRouteSuspense(TimelinesRoutesLazy),
        },
      ],
    };
  }
}
