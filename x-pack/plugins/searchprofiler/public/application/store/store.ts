/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useReducer } from 'react';
import { reducer } from './reducer';
import { Operation, ShardSerialized, Targets } from '../types';

export type OperationNoChildParent = Omit<Operation, 'children' | 'parent'>;

interface HighlightDetails {
  indexName: string;
  operation: OperationNoChildParent;
  shardName: string;
}

export interface State {
  profiling: boolean;
  pristine: boolean;
  highlightDetails: HighlightDetails | null;
  activeTab: Targets | null;
  currentResponse: ShardSerialized[] | null;
}

export const initialState: State = {
  profiling: false,
  pristine: true,
  highlightDetails: null,
  activeTab: null,
  currentResponse: null,
};

export const useStore = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return {
    state,
    dispatch,
  };
};
