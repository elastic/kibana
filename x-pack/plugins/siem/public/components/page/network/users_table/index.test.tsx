/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { getOr } from 'lodash/fp';
import * as React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { FlowTarget } from '../../../../graphql/types';
import { mockGlobalState, TestProviders } from '../../../../mock';
import { createStore, networkModel, State } from '../../../../store';

import { UsersTable } from '.';
import { mockUsersData } from './mock';

describe('Users Table Component', () => {
  const loadMore = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('Rendering', () => {
    test('it renders the default Users table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <UsersTable
            totalCount={1}
            loading={false}
            loadMore={loadMore}
            data={mockUsersData.edges}
            flowTarget={FlowTarget.source}
            hasNextPage={getOr(false, 'hasNextPage', mockUsersData.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockUsersData.pageInfo)!}
            type={networkModel.NetworkType.details}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('Sorting on Table', () => {
    test('when you click on the column header, you should show the sorting icon', () => {
      const wrapper = mount(
        <MockedProvider>
          <TestProviders store={store}>
            <UsersTable
              totalCount={1}
              loading={false}
              loadMore={loadMore}
              data={mockUsersData.edges}
              flowTarget={FlowTarget.source}
              hasNextPage={getOr(false, 'hasNextPage', mockUsersData.pageInfo)!}
              nextCursor={getOr(null, 'endCursor.value', mockUsersData.pageInfo)!}
              type={networkModel.NetworkType.details}
            />
          </TestProviders>
        </MockedProvider>
      );
      expect(store.getState().network.details.queries!.users.usersSortField).toEqual({
        direction: 'asc',
        field: 'name',
      });

      wrapper
        .find('.euiTable thead tr th button')
        .first()
        .simulate('click');

      wrapper.update();

      expect(store.getState().network.details.queries!.users.usersSortField).toEqual({
        direction: 'desc',
        field: 'name',
      });
      expect(
        wrapper
          .find('.euiTable thead tr th button')
          .first()
          .text()
      ).toEqual('NameClick to sort in ascending order');
    });
  });
});
