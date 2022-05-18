/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction, Reducer } from 'redux';
import reduceReducers from 'reduce-reducers';

import { tGridReducer } from '@kbn/timelines-plugin/public';

import { hostsReducer } from '../../hosts/store';
import { networkReducer } from '../../network/store';
import { usersReducer } from '../../users/store';
import { timelineReducer } from '../../timelines/store/timeline/reducer';
import { managementReducer } from '../../management/store/reducer';
import { ManagementPluginReducer } from '../../management';
import { SubPluginsInitReducer } from '../store';
import { mockGlobalState } from './global_state';
import { TimelineState } from '../../timelines/store/timeline/types';
import { defaultHeaders } from '../../timelines/components/timeline/body/column_headers/default_headers';

type GlobalThis = typeof globalThis;
interface Global extends GlobalThis {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any;
}

export const globalNode: Global = global;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const combineTimelineReducer = reduceReducers<any>(
  {
    ...mockGlobalState.timeline,
    timelineById: {
      ...mockGlobalState.timeline.timelineById,
      test: {
        ...mockGlobalState.timeline.timelineById.test,
        defaultColumns: defaultHeaders,
        loadingText: 'events',
        footerText: 'events',
        documentType: '',
        selectAll: false,
        queryFields: [],
        unit: (n: number) => n,
      },
    },
  },
  tGridReducer,
  timelineReducer
) as Reducer<TimelineState, AnyAction>;

export const SUB_PLUGINS_REDUCER: SubPluginsInitReducer = {
  hosts: hostsReducer,
  network: networkReducer,
  users: usersReducer,
  timeline: combineTimelineReducer,
  /**
   * These state's are wrapped in `Immutable`, but for compatibility with the overall app architecture,
   * they are cast to mutable versions here.
   */
  management: managementReducer as unknown as ManagementPluginReducer['management'],
};
