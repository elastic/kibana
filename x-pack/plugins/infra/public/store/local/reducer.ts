/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import { initialLogFilterState, logFilterReducer, LogFilterState } from './log_filter';
import { initialLogMinimapState, logMinimapReducer, LogMinimapState } from './log_minimap';
import { initialLogPositionState, logPositionReducer, LogPositionState } from './log_position';
import { initialLogTextviewState, logTextviewReducer, LogTextviewState } from './log_textview';
import { initialMetricTimeState, metricTimeReducer, MetricTimeState } from './metric_time';
import { initialWaffleFilterState, waffleFilterReducer, WaffleFilterState } from './waffle_filter';
import {
  initialWaffleOptionsState,
  waffleOptionsReducer,
  WaffleOptionsState,
} from './waffle_options';
import { initialWaffleTimeState, waffleTimeReducer, WaffleTimeState } from './waffle_time';

export interface LocalState {
  logFilter: LogFilterState;
  logMinimap: LogMinimapState;
  logPosition: LogPositionState;
  logTextview: LogTextviewState;
  metricTime: MetricTimeState;
  waffleFilter: WaffleFilterState;
  waffleTime: WaffleTimeState;
  waffleMetrics: WaffleOptionsState;
}

export const initialLocalState: LocalState = {
  logFilter: initialLogFilterState,
  logMinimap: initialLogMinimapState,
  logPosition: initialLogPositionState,
  logTextview: initialLogTextviewState,
  metricTime: initialMetricTimeState,
  waffleFilter: initialWaffleFilterState,
  waffleTime: initialWaffleTimeState,
  waffleMetrics: initialWaffleOptionsState,
};

export const localReducer = combineReducers<LocalState>({
  logFilter: logFilterReducer,
  logMinimap: logMinimapReducer,
  logPosition: logPositionReducer,
  logTextview: logTextviewReducer,
  metricTime: metricTimeReducer,
  waffleFilter: waffleFilterReducer,
  waffleTime: waffleTimeReducer,
  waffleMetrics: waffleOptionsReducer,
});
