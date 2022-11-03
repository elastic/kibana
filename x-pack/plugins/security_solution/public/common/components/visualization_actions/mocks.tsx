/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { cloneDeep } from 'lodash/fp';

import {
  TestProviders,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../mock';
import type { State } from '../../store';
import { createStore } from '../../store';
import { dataTableReducer } from '../../store/data_table/reducer';

export const queryFromSearchBar = {
  query: 'host.name: *',
  language: 'kql',
};

export const filterFromSearchBar = [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'host.id',
      params: {
        query: '123',
      },
    },
    query: {
      match_phrase: {
        'host.id': '123',
      },
    },
  },
];

export const mockCreateStoreWithQueryFilters = () => {
  const { storage } = createSecuritySolutionStorageMock();

  const state: State = mockGlobalState;

  const myState = cloneDeep(state);

  myState.inputs = {
    ...myState.inputs,
    global: {
      ...myState.inputs.global,
      query: queryFromSearchBar,
      filters: filterFromSearchBar,
    },
  };
  return createStore(
    myState,
    SUB_PLUGINS_REDUCER,
    { dataTable: dataTableReducer },
    kibanaObservable,
    storage
  );
};

export const wrapper = ({ children }: { children: React.ReactElement }) => (
  <TestProviders store={mockCreateStoreWithQueryFilters()}>{children}</TestProviders>
);
