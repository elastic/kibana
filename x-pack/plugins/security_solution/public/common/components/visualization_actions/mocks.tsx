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
import type { LensAttributes } from './types';

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
  return createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
};

export const wrapper = ({ children }: { children: React.ReactElement }) => (
  <TestProviders store={mockCreateStoreWithQueryFilters()}>{children}</TestProviders>
);

export const mockAttributes: LensAttributes = {
  description: '',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          '416b6fad-1923-4f6a-a2df-b223bb287e30': {
            columnOrder: ['b00c65ea-32be-4163-bfc8-f795b1ef9d06'],
            columns: {
              'b00c65ea-32be-4163-bfc8-f795b1ef9d06': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: ' ',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'host.name',
              },
            },
            incompleteColumns: {},
          },
        },
      },
    },
    filters: [
      {
        meta: {
          type: 'phrases',
          key: '_index',
          params: ['packetbeat-*'],
          alias: null,
          negate: false,
          disabled: false,
        },
        query: {
          bool: {
            should: [{ match_phrase: { _index: 'packetbeat-*' } }],
            minimum_should_match: 1,
          },
        },
      },
    ],
    query: { query: '', language: 'kuery' },
    visualization: {
      accessor: 'b00c65ea-32be-4163-bfc8-f795b1ef9d06',
      layerId: '416b6fad-1923-4f6a-a2df-b223bb287e30',
      layerType: 'data',
    },
  },
  title: '',
  visualizationType: 'lnsLegacyMetric',
  references: [
    {
      id: 'security-solution-default',
      name: 'indexpattern-datasource-current-indexpattern',
      type: 'index-pattern',
    },
    {
      id: 'security-solution-default',
      name: 'indexpattern-datasource-layer-416b6fad-1923-4f6a-a2df-b223bb287e30',
      type: 'index-pattern',
    },
  ],
};
