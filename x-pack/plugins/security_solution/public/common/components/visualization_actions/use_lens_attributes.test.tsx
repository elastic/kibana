/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { cloneDeep } from 'lodash/fp';

import {
  TestProviders,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../mock';
import { getExternalAlertLensAttributes } from './lens_attributes/common/external_alert';
import { useLensAttributes } from './use_lens_attributes';
import { filterHostExternalAlertData, getHostDetailsPageFilter, getIndexFilters } from './utils';
import { createStore, State } from '../../store';

jest.mock('../../containers/sourcerer', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({
    selectedPatterns: ['auditbeat-*'],
    dataViewId: 'security-solution-default',
  }),
}));

jest.mock('../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      detailName: 'mockHost',
      pageName: 'hosts',
      tabName: 'externalAlerts',
    },
  ]),
}));

describe('useLensAttributes', () => {
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  const queryFromSearchBar = {
    query: 'host.name: *',
    language: 'kql',
  };

  const filterFromSearchBar = [
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
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    const myState = cloneDeep(state);
    myState.inputs = {
      ...myState.inputs,
      global: {
        ...myState.inputs.global,
        query: queryFromSearchBar,
        filters: filterFromSearchBar,
      },
    };
    store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  it('should should add query', () => {
    const wrapper = ({ children }: { children: React.ReactElement }) => (
      <TestProviders store={store}>{children}</TestProviders>
    );
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.query).toEqual({ query: 'host.name: *', language: 'kql' });
  });

  it('should should add filters', () => {
    const wrapper = ({ children }: { children: React.ReactElement }) => (
      <TestProviders store={store}>{children}</TestProviders>
    );
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes().state.filters,
      ...filterFromSearchBar,
      ...getHostDetailsPageFilter('mockHost'),
      ...filterHostExternalAlertData,
      ...getIndexFilters(['auditbeat-*']),
    ]);
  });

  it('should should add data view id to references', () => {
    const wrapper = ({ children }: { children: React.ReactElement }) => (
      <TestProviders store={store}>{children}</TestProviders>
    );
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.references).toEqual([
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-current-indexpattern',
      },
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-a3c54471-615f-4ff9-9fda-69b5b2ea3eef',
      },
      {
        type: 'index-pattern',
        name: '723c4653-681b-4105-956e-abef287bf025',
        id: 'security-solution-default',
      },
      {
        type: 'index-pattern',
        name: 'a04472fc-94a3-4b8d-ae05-9d30ea8fbd6a',
        id: 'security-solution-default',
      },
    ]);
  });
});
