/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { SecuritySubPluginWithStore } from '../app/types';
import { restoreDiscoverFromStorage } from '../common/store/data_table/discover';
import { routes } from './routes';
import { initialTimelineState, timelineReducer } from './store/timeline/reducer';
import type { TimelineState } from './store/timeline/types';
import type { SecuritySolutionDiscoverState } from '../common/store/discover/model';
import { securitySolutionDiscoverReducer } from '../common/store/discover/reducer';
import { restoreTimelineFromStorage } from '../common/store/data_table/timeline';

export class Timelines {
  public setup() {}

  public start(
    storage: Storage
  ): SecuritySubPluginWithStore<'timeline', TimelineState> &
    SecuritySubPluginWithStore<'discover', SecuritySolutionDiscoverState> {
    const restoredTimelineState = {
      ...initialTimelineState,
      timelineById: restoreTimelineFromStorage(storage) ?? initialTimelineState.timelineById,
    };
    return {
      routes,
      store: {
        initialState: {
          timeline: restoredTimelineState,
          discover: restoreDiscoverFromStorage({ storage }),
        },
        reducer: { timeline: timelineReducer, discover: securitySolutionDiscoverReducer },
      },
    };
  }
}
