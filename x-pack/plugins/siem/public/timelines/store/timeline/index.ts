/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Reducer } from 'redux';
import * as timelineActions from './actions';
import * as timelineSelectors from './selectors';
import { TimelineState } from './types';

export { timelineActions, timelineSelectors };

export interface TimelinePluginState {
  timeline: TimelineState;
}

export interface TimelinePluginReducer {
  timeline: Reducer<TimelineState, AnyAction>;
}
