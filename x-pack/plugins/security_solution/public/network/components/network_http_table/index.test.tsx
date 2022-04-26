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
import { createStore, State } from '../../../common/store';
import { networkModel } from '../../store';

import { NetworkHttpTable } from '.';
import { mockData } from './mock';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/components/link_to');

describe('NetworkHttp Table Component', () => {
  const loadPage = jest.fn();
  const state: State = mockGlobalState;
  const defaultProps = {
    data: mockData.edges,
    fakeTotalCount: getOr(50, 'fakeTotalCount', mockData.pageInfo),
    id: 'http',
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: getOr(false, 'showMorePagesIndicator', mockData.pageInfo),
    totalCount: mockData.totalCount,
    type: networkModel.NetworkType.page,
  };

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const mount = useMountAppended();

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  describe('rendering', () => {
    test('it renders the default NetworkHttp table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <NetworkHttpTable {...defaultProps} />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('Memo(NetworkHttpTableComponent)')).toMatchSnapshot();
    });
  });

  describe('Sorting', () => {
    test('when you click on the column header, you should show the sorting icon', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <NetworkHttpTable {...defaultProps} />
        </TestProviders>
      );

      expect(store.getState().network.page.queries?.http.sort).toEqual({
        direction: 'desc',
      });

      wrapper.find('.euiTable thead tr th button').first().simulate('click');

      wrapper.update();

      expect(store.getState().network.page.queries?.http.sort).toEqual({
        direction: 'asc',
      });
      expect(wrapper.find('.euiTable thead tr th button').first().find('svg')).toBeTruthy();
    });
  });
});
