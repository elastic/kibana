/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  InfraMetricInput,
  InfraMetricType,
  InfraNodeType,
  InfraPathInput,
} from '../../../graphql/types';
import { InfraGroupByOptions } from '../../../lib/lib';
import {
  changeCustomOptions,
  changeGroupBy,
  changeMetric,
  changeNodeType,
  changeView,
} from './actions';

export interface WaffleOptionsState {
  metric: InfraMetricInput;
  groupBy: InfraPathInput[];
  nodeType: InfraNodeType;
  view: string;
  customOptions: InfraGroupByOptions[];
}

export const initialWaffleOptionsState: WaffleOptionsState = {
  metric: { type: InfraMetricType.cpu },
  groupBy: [],
  nodeType: InfraNodeType.host,
  view: 'map',
  customOptions: [],
};

const currentMetricReducer = reducerWithInitialState(initialWaffleOptionsState.metric).case(
  changeMetric,
  (current, target) => target
);

const currentCustomOptionsReducer = reducerWithInitialState(
  initialWaffleOptionsState.customOptions
).case(changeCustomOptions, (current, target) => target);

const currentGroupByReducer = reducerWithInitialState(initialWaffleOptionsState.groupBy).case(
  changeGroupBy,
  (current, target) => target
);

const currentNodeTypeReducer = reducerWithInitialState(initialWaffleOptionsState.nodeType).case(
  changeNodeType,
  (current, target) => target
);

const currentViewReducer = reducerWithInitialState(initialWaffleOptionsState.view).case(
  changeView,
  (current, target) => target
);

export const waffleOptionsReducer = combineReducers<WaffleOptionsState>({
  metric: currentMetricReducer,
  groupBy: currentGroupByReducer,
  nodeType: currentNodeTypeReducer,
  view: currentViewReducer,
  customOptions: currentCustomOptionsReducer,
});
