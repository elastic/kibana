/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createStateContainer,
  createStateContainerReactHelpers,
} from '../../../../../../../../../src/plugins/kibana_utils/public';

interface ContainerState {
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
}

interface StateTransitions {
  setRangeFrom: (state: ContainerState) => (rangeFrom: string) => ContainerState;
  setRangeTo: (state: ContainerState) => (rangeTo: string) => ContainerState;
  setKuery: (state: ContainerState) => (kuery: string) => ContainerState;
}

const defaultState: ContainerState = {
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  kuery: '',
};

const transitions: StateTransitions = {
  setRangeFrom: (state) => (rangeFrom) => ({ ...state, rangeFrom }),
  setRangeTo: (state) => (rangeTo) => ({ ...state, rangeTo }),
  setKuery: (state) => (kuery) => ({ ...state, kuery }),
};

const alertsPageStateContainer = createStateContainer(defaultState, transitions);

type StateContainer = typeof alertsPageStateContainer;

const { Provider, useContainer } = createStateContainerReactHelpers<StateContainer>();

export { Provider, alertsPageStateContainer, useContainer, defaultState };
export type { StateContainer, ContainerState, StateTransitions };
