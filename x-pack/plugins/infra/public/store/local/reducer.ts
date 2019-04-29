/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import { initialLogFilterState, logFilterReducer, LogFilterState } from './log_filter';
import { flyoutOptionsReducer, FlyoutOptionsState, initialFlyoutOptionsState } from './log_flyout';
import { initialLogPositionState, logPositionReducer, LogPositionState } from './log_position';
import { initialWaffleFilterState, waffleFilterReducer, WaffleFilterState } from './waffle_filter';
import {
  initialWaffleOptionsState,
  waffleOptionsReducer,
  WaffleOptionsState,
} from './waffle_options';
import { initialWaffleTimeState, waffleTimeReducer, WaffleTimeState } from './waffle_time';

export interface LocalState {
  logFilter: LogFilterState;
  logPosition: LogPositionState;
  waffleFilter: WaffleFilterState;
  waffleTime: WaffleTimeState;
  waffleMetrics: WaffleOptionsState;
  logFlyout: FlyoutOptionsState;
}

export const initialLocalState: LocalState = {
  logFilter: initialLogFilterState,
  logPosition: initialLogPositionState,
  waffleFilter: initialWaffleFilterState,
  waffleTime: initialWaffleTimeState,
  waffleMetrics: initialWaffleOptionsState,
  logFlyout: initialFlyoutOptionsState,
};

export const localReducer = combineReducers<LocalState>({
  logFilter: logFilterReducer,
  logPosition: logPositionReducer,
  waffleFilter: waffleFilterReducer,
  waffleTime: waffleTimeReducer,
  waffleMetrics: waffleOptionsReducer,
  logFlyout: flyoutOptionsReducer,
});
