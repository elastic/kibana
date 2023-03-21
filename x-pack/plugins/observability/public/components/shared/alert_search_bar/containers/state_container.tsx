/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createStateContainer,
  createStateContainerReactHelpers,
} from '@kbn/kibana-utils-plugin/public';
import { AlertStatus } from '../../../../../common/typings';
import { ALL_ALERTS } from '../constants';

interface AlertSearchBarContainerState {
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  status: AlertStatus;
}

interface AlertSearchBarStateTransitions {
  setRangeFrom: (
    state: AlertSearchBarContainerState
  ) => (rangeFrom: string) => AlertSearchBarContainerState;
  setRangeTo: (
    state: AlertSearchBarContainerState
  ) => (rangeTo: string) => AlertSearchBarContainerState;
  setKuery: (
    state: AlertSearchBarContainerState
  ) => (kuery: string) => AlertSearchBarContainerState;
  setStatus: (
    state: AlertSearchBarContainerState
  ) => (status: AlertStatus) => AlertSearchBarContainerState;
}

const defaultState: AlertSearchBarContainerState = {
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  kuery: '',
  status: ALL_ALERTS.status,
};

const transitions: AlertSearchBarStateTransitions = {
  setRangeFrom: (state) => (rangeFrom) => ({ ...state, rangeFrom }),
  setRangeTo: (state) => (rangeTo) => ({ ...state, rangeTo }),
  setKuery: (state) => (kuery) => ({ ...state, kuery }),
  setStatus: (state) => (status) => ({ ...state, status }),
};

const alertSearchBarStateContainer = createStateContainer(defaultState, transitions);

type AlertSearchBarStateContainer = typeof alertSearchBarStateContainer;

const { Provider, useContainer } = createStateContainerReactHelpers<AlertSearchBarStateContainer>();

export { Provider, alertSearchBarStateContainer, useContainer, defaultState };
export type {
  AlertSearchBarStateContainer,
  AlertSearchBarContainerState,
  AlertSearchBarStateTransitions,
};
