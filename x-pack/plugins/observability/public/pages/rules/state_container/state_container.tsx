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
import { RuleStatus } from '@kbn/triggers-actions-ui-plugin/public';

interface RulesPageContainerState {
  lastResponse: string[];
  status: RuleStatus[];
}

const defaultState: RulesPageContainerState = {
  lastResponse: [],
  status: [],
};

interface RulesPageStateTransitions {
  setLastResponse: (
    state: RulesPageContainerState
  ) => (lastResponse: string[]) => RulesPageContainerState;
  setStatus: (state: RulesPageContainerState) => (status: RuleStatus[]) => RulesPageContainerState;
}

const transitions: RulesPageStateTransitions = {
  setLastResponse: (state) => (lastResponse) => {
    const filteredIds = lastResponse;
    lastResponse.forEach((id) => {
      const isPreviouslyChecked = state.lastResponse.includes(id);
      if (!isPreviouslyChecked) {
        filteredIds.concat(id);
      } else {
        filteredIds.filter((val) => {
          return val !== id;
        });
      }
    });
    return { ...state, lastResponse: filteredIds };
  },
  setStatus: (state) => (status) => {
    const filteredIds = status;
    status.forEach((id) => {
      const isPreviouslyChecked = state.status.includes(id);
      if (!isPreviouslyChecked) {
        filteredIds.concat(id);
      } else {
        filteredIds.filter((val) => {
          return val !== id;
        });
      }
    });
    return { ...state, status: filteredIds };
  },
};

const rulesPageStateContainer = createStateContainer(defaultState, transitions);

type RulesPageStateContainer = typeof rulesPageStateContainer;
const { Provider, useContainer } = createStateContainerReactHelpers<RulesPageStateContainer>();

export { Provider, rulesPageStateContainer, useContainer, defaultState };
export type { RulesPageStateContainer, RulesPageContainerState, RulesPageStateTransitions };
