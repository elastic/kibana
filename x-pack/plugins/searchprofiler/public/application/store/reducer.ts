/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'react';
import { State } from './store';

import { OnHighlightChangeArgs } from '../components/profile_tree';
import { ShardSerialized, Targets } from '../types';
import { hasSearch, hasAggregations } from '../utils';

export type Action =
  | { type: 'setProfiling'; value: boolean }
  | { type: 'setHighlightDetails'; value: OnHighlightChangeArgs | null }
  | { type: 'setActiveTab'; value: Targets | null }
  | { type: 'setCurrentResponse'; value: ShardSerialized[] | null };

export const reducer: Reducer<State, Action> = (state, action) => {
  const nextState = { ...state };

  if (action.type === 'setProfiling') {
    nextState.pristine = false;
    nextState.profiling = action.value;
    if (nextState.profiling) {
      nextState.currentResponse = null;
      nextState.highlightDetails = null;
    }
    return nextState;
  }

  if (action.type === 'setHighlightDetails') {
    if (action.value) {
      const value = action.value;
      // Exclude children to avoid unnecessary work copying a recursive structure.
      const { children, parent, ...restOfOperation } = value.operation;
      nextState.highlightDetails = {
        indexName: value.indexName,
        operation: Object.freeze(restOfOperation),
        // prettier-ignore
        shardName: `[${/* shard id */value.shard.id[0]}][${/* shard number */value.shard.id[2] }]`,
      };
    } else {
      nextState.highlightDetails = null;
    }
    return nextState;
  }

  if (action.type === 'setActiveTab') {
    nextState.activeTab = action.value;
    return nextState;
  }

  if (action.type === 'setCurrentResponse') {
    nextState.currentResponse = action.value;
    if (nextState.currentResponse) {
      const currentResponseHasAggregations = hasAggregations(nextState.currentResponse);
      const currentResponseHasSearch = hasSearch(nextState.currentResponse);
      if (
        nextState.activeTab === 'searches' &&
        !currentResponseHasSearch &&
        currentResponseHasAggregations
      ) {
        nextState.activeTab = 'aggregations';
      } else if (
        nextState.activeTab === 'aggregations' &&
        !currentResponseHasAggregations &&
        currentResponseHasSearch
      ) {
        nextState.activeTab = 'searches';
      } else if (!nextState.activeTab) {
        // Default to searches tab
        nextState.activeTab = 'searches';
      }
    } else {
      nextState.activeTab = null;
    }
    return nextState;
  }

  throw new Error(`Unknown action: ${action}`);
};
