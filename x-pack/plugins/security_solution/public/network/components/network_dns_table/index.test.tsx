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
import {
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../common/mock';
import { State, createStore } from '../../../common/store';
import { networkModel } from '../../store';
import { useMountAppended } from '../../../common/utils/use_mount_appended';

import { NetworkDnsTable } from '.';
import { mockData } from './mock';

jest.mock('../../../common/lib/kibana');

describe('NetworkTopNFlow Table Component', () => {
  const loadPage = jest.fn();
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const mount = useMountAppended();

  const defaultProps = {
    data: mockData.edges,
    fakeTotalCount: getOr(50, 'fakeTotalCount', mockData.pageInfo),
    id: 'dns',
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: getOr(false, 'showMorePagesIndicator', mockData.pageInfo),
    totalCount: mockData.totalCount,
    type: networkModel.NetworkType.page,
  };

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  describe('rendering', () => {
    test('it renders the default NetworkTopNFlow table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <NetworkDnsTable {...defaultProps} />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('Memo(NetworkDnsTableComponent)')).toMatchSnapshot();
    });
  });

  describe('Sorting', () => {
    test('when you click on the column header, you should show the sorting icon', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <NetworkDnsTable {...defaultProps} />
        </TestProviders>
      );

      expect(store.getState().network.page.queries?.dns.sort).toEqual({
        direction: 'desc',
        field: 'queryCount',
      });

      wrapper.find('.euiTable thead tr th button').first().simulate('click');

      wrapper.update();

      expect(store.getState().network.page.queries?.dns.sort).toEqual({
        direction: 'asc',
        field: 'dnsName',
      });
      expect(wrapper.find('.euiTable thead tr th button').first().find('svg')).toBeTruthy();
    });
  });
});
