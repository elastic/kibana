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
import { useMountAppended } from '../../../common/utils/use_mount_appended';
import type { State } from '../../../common/store';
import { createStore } from '../../../common/store';
import { networkModel } from '../../store';
import { NetworkTopNFlowTable } from '.';
import { mockData } from './mock';
import { FlowTargetSourceDest } from '../../../../common/search_strategy';
import { tGridReducer } from '@kbn/timelines-plugin/public';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/components/link_to');

describe('NetworkTopNFlow Table Component', () => {
  const loadPage = jest.fn();
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    { dataTable: tGridReducer },
    kibanaObservable,
    storage
  );
  const mount = useMountAppended();
  const defaultProps = {
    data: mockData.edges,
    fakeTotalCount: getOr(50, 'fakeTotalCount', mockData.pageInfo),
    flowTargeted: FlowTargetSourceDest.source,
    id: 'topNFlowSource',
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: getOr(false, 'showMorePagesIndicator', mockData.pageInfo),
    totalCount: mockData.totalCount,
    type: networkModel.NetworkType.page,
  };

  beforeEach(() => {
    store = createStore(
      state,
      SUB_PLUGINS_REDUCER,
      { dataTable: tGridReducer },
      kibanaObservable,
      storage
    );
  });

  describe('rendering', () => {
    test('it renders the default NetworkTopNFlow table on the Network page', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <NetworkTopNFlowTable {...defaultProps} />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('Memo(NetworkTopNFlowTableComponent)')).toMatchSnapshot();
    });

    test('it renders the default NetworkTopNFlow table on the IP Details page', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <NetworkTopNFlowTable {...defaultProps} type={networkModel.NetworkType.details} />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('Memo(NetworkTopNFlowTableComponent)')).toMatchSnapshot();
    });
  });

  describe('Sorting on Table', () => {
    test('when you click on the column header, you should show the sorting icon', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <NetworkTopNFlowTable {...defaultProps} />
        </TestProviders>
      );
      expect(store.getState().network.page.queries.topNFlowSource.sort).toEqual({
        direction: 'desc',
        field: 'bytes_out',
      });

      wrapper.find('.euiTable thead tr th button').at(1).simulate('click');

      wrapper.update();

      expect(store.getState().network.page.queries.topNFlowSource.sort).toEqual({
        direction: 'asc',
        field: 'bytes_out',
      });
      expect(wrapper.find('.euiTable thead tr th button').first().text()).toEqual('Bytes in');
      expect(wrapper.find('.euiTable thead tr th button').at(1).text()).toEqual('Bytes out');
      expect(wrapper.find('.euiTable thead tr th button').at(1).find('svg')).toBeTruthy();
    });
  });
});
