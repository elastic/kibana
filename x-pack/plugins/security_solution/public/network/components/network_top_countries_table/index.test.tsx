/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { getOr } from 'lodash/fp';
import React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import '../../../common/mock/match_media';
import { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import {
  mockGlobalState,
  mockIndexPattern,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../common/mock';
import { useMountAppended } from '../../../common/utils/use_mount_appended';
import { createStore, State } from '../../../common/store';
import { networkModel } from '../../store';

import { NetworkTopCountriesTable } from '.';
import { mockData } from './mock';

jest.mock('../../../common/lib/kibana');

describe('NetworkTopCountries Table Component', () => {
  const loadPage = jest.fn();
  const state: State = mockGlobalState;
  const mount = useMountAppended();
  const defaultProps = {
    data: mockData.NetworkTopCountries.edges,
    fakeTotalCount: getOr(50, 'fakeTotalCount', mockData.NetworkTopCountries.pageInfo),
    flowTargeted: FlowTargetSourceDest.source,
    id: 'topCountriesSource',
    indexPattern: mockIndexPattern,
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: getOr(
      false,
      'showMorePagesIndicator',
      mockData.NetworkTopCountries.pageInfo
    ),
    totalCount: mockData.NetworkTopCountries.totalCount,
    type: networkModel.NetworkType.page,
  };

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  describe('rendering', () => {
    test('it renders the default NetworkTopCountries table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <NetworkTopCountriesTable {...defaultProps} />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('Memo(NetworkTopCountriesTableComponent)')).toMatchSnapshot();
    });
    test('it renders the IP Details NetworkTopCountries table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <NetworkTopCountriesTable {...defaultProps} type={networkModel.NetworkType.details} />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('Memo(NetworkTopCountriesTableComponent)')).toMatchSnapshot();
    });
  });

  describe('Sorting on Table', () => {
    test('when you click on the column header, you should show the sorting icon', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <NetworkTopCountriesTable {...defaultProps} />
        </TestProviders>
      );
      expect(store.getState().network.page.queries.topCountriesSource.sort).toEqual({
        direction: 'desc',
        field: 'bytes_out',
      });

      wrapper.find('.euiTable thead tr th button').at(1).simulate('click');

      wrapper.update();

      expect(store.getState().network.page.queries.topCountriesSource.sort).toEqual({
        direction: 'asc',
        field: 'bytes_out',
      });
      expect(wrapper.find('.euiTable thead tr th button').first().text()).toEqual('Bytes in');
      expect(wrapper.find('.euiTable thead tr th button').at(1).text()).toEqual('Bytes out');
      expect(wrapper.find('.euiTable thead tr th button').at(1).find('svg')).toBeTruthy();
    });
  });
});
