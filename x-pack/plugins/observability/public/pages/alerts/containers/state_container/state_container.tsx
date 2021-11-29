/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createStateContainer,
  createStateContainerReactHelpers,
} from '../../../../../../../../src/plugins/kibana_utils/public';
import type { AlertWorkflowStatus } from '../../../../../common/typings';

interface AlertsPageContainerState {
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  workflowStatus: AlertWorkflowStatus;
}

interface AlertsPageStateTransitions {
  setRangeFrom: (
    state: AlertsPageContainerState
  ) => (rangeFrom: string) => AlertsPageContainerState;
  setRangeTo: (state: AlertsPageContainerState) => (rangeTo: string) => AlertsPageContainerState;
  setKuery: (state: AlertsPageContainerState) => (kuery: string) => AlertsPageContainerState;
  setWorkflowStatus: (
    state: AlertsPageContainerState
  ) => (workflowStatus: AlertWorkflowStatus) => AlertsPageContainerState;
}

const defaultState: AlertsPageContainerState = {
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  kuery: '',
  workflowStatus: 'open',
};

const transitions: AlertsPageStateTransitions = {
  setRangeFrom: (state) => (rangeFrom) => ({ ...state, rangeFrom }),
  setRangeTo: (state) => (rangeTo) => ({ ...state, rangeTo }),
  setKuery: (state) => (kuery) => ({ ...state, kuery }),
  setWorkflowStatus: (state) => (workflowStatus) => ({ ...state, workflowStatus }),
};

const alertsPageStateContainer = createStateContainer(defaultState, transitions);

type AlertsPageStateContainer = typeof alertsPageStateContainer;

const { Provider, useContainer } = createStateContainerReactHelpers<AlertsPageStateContainer>();

export { Provider, alertsPageStateContainer, useContainer, defaultState };
export type { AlertsPageStateContainer, AlertsPageContainerState, AlertsPageStateTransitions };
