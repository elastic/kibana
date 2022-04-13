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

import { UsersTable } from '.';
import { mockUsersData } from './mock';
import { FlowTarget } from '../../../../common/search_strategy';

jest.mock('../../../common/lib/kibana');

describe('Users Table Component', () => {
  const loadPage = jest.fn();
  const state: State = mockGlobalState;

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const mount = useMountAppended();

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  const defaultProps = {
    data: mockUsersData.edges,
    flowTarget: FlowTarget.source,
    fakeTotalCount: getOr(50, 'fakeTotalCount', mockUsersData.pageInfo),
    id: 'user',
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: getOr(false, 'showMorePagesIndicator', mockUsersData.pageInfo),
    totalCount: 1,
    type: networkModel.NetworkType.details,
  };

  describe('Rendering', () => {
    test('it renders the default Users table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <UsersTable {...defaultProps} />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('Connect(UsersTableComponent)')).toMatchSnapshot();
    });
  });

  describe('Sorting on Table', () => {
    test('when you click on the column header, you should show the sorting icon', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <UsersTable {...defaultProps} />
        </TestProviders>
      );
      expect(store.getState().network.details.queries?.users.sort).toEqual({
        direction: 'asc',
        field: 'name',
      });

      wrapper.find('.euiTable thead tr th button').first().simulate('click');

      wrapper.update();

      expect(store.getState().network.details.queries?.users.sort).toEqual({
        direction: 'desc',
        field: 'name',
      });
      expect(wrapper.find('.euiTable thead tr th button').first().text()).toEqual('User');
    });
  });
});
