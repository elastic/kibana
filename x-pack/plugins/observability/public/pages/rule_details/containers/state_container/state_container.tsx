/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createStateContainer,
  createStateContainerReactHelpers,
  PureTransition,
} from '@kbn/kibana-utils-plugin/public';
import { EXECUTION_TAB, ALERTS_TAB } from '../../types';

export type TabId = typeof EXECUTION_TAB | typeof ALERTS_TAB;

interface RuleDetailsState {
  tabId: TabId;
}

interface AlertsPageStateTransitions {
  setTab: PureTransition<RuleDetailsState, [TabId]>;
}

const defaultState: RuleDetailsState = {
  tabId: EXECUTION_TAB,
};

const transitions: AlertsPageStateTransitions = {
  setTab: (state) => (tabId) => {
    return {
      ...state,
      tabId,
    };
  },
};

const ruleDetailsPageStateContainer = createStateContainer(defaultState, transitions);

type RuleDetailsPageStateContainer = typeof ruleDetailsPageStateContainer;

const { Provider, useContainer } =
  createStateContainerReactHelpers<RuleDetailsPageStateContainer>();

export { Provider, ruleDetailsPageStateContainer, useContainer, defaultState };
export type { RuleDetailsPageStateContainer, RuleDetailsState, AlertsPageStateTransitions };
