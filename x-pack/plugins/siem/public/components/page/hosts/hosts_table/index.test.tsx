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

import {
  apolloClientObservable,
  mockFrameworks,
  mockIndexPattern,
  mockGlobalState,
  TestProviders,
} from '../../../../mock';
import { createStore, hostsModel, State } from '../../../../store';

import { HostsTable } from './index';
import { mockData } from './mock';
import { KibanaConfigContext } from '../../../../lib/adapters/framework/kibana_framework_adapter';

describe('Load More Table Component', () => {
  const loadMore = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });

  describe('rendering', () => {
    test('it renders the default Hosts table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <KibanaConfigContext.Provider value={mockFrameworks.default_UTC}>
            <HostsTable
              indexPattern={mockIndexPattern}
              loading={false}
              data={mockData.Hosts.edges}
              totalCount={mockData.Hosts.totalCount}
              hasNextPage={getOr(false, 'hasNextPage', mockData.Hosts.pageInfo)!}
              nextCursor={getOr(null, 'endCursor.value', mockData.Hosts.pageInfo)}
              loadMore={loadMore}
              type={hostsModel.HostsType.page}
            />
          </KibanaConfigContext.Provider>
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    describe('Sorting on Table', () => {
      let wrapper = mount(
        <MockedProvider>
          <TestProviders store={store}>
            <HostsTable
              indexPattern={mockIndexPattern}
              loading={false}
              data={mockData.Hosts.edges}
              totalCount={mockData.Hosts.totalCount}
              hasNextPage={getOr(false, 'hasNextPage', mockData.Hosts.pageInfo)!}
              nextCursor={getOr(null, 'endCursor.value', mockData.Hosts.pageInfo)}
              loadMore={loadMore}
              type={hostsModel.HostsType.page}
            />
          </TestProviders>
        </MockedProvider>
      );

      beforeEach(() => {
        wrapper = mount(
          <MockedProvider>
            <TestProviders store={store}>
              <HostsTable
                indexPattern={mockIndexPattern}
                loading={false}
                data={mockData.Hosts.edges}
                totalCount={mockData.Hosts.totalCount}
                hasNextPage={getOr(false, 'hasNextPage', mockData.Hosts.pageInfo)!}
                nextCursor={getOr(null, 'endCursor.value', mockData.Hosts.pageInfo)}
                loadMore={loadMore}
                type={hostsModel.HostsType.page}
              />
            </TestProviders>
          </MockedProvider>
        );
      });
      test('Initial value of the store', () => {
        expect(store.getState().hosts.page.queries.hosts).toEqual({
          direction: 'desc',
          sortField: 'lastSeen',
          limit: 10,
        });
        expect(
          wrapper
            .find('.euiTable thead tr th button')
            .at(1)
            .text()
        ).toEqual('Last SeenClick to sort in ascending order');
        expect(
          wrapper
            .find('.euiTable thead tr th button')
            .at(1)
            .find('svg')
        ).toBeTruthy();
      });

      test('when you click on the column header, you should show the sorting icon', () => {
        wrapper
          .find('.euiTable thead tr th button')
          .first()
          .simulate('click');

        wrapper.update();

        expect(store.getState().hosts.page.queries.hosts).toEqual({
          direction: 'asc',
          sortField: 'hostName',
          limit: 10,
        });
        expect(
          wrapper
            .find('.euiTable thead tr th button')
            .first()
            .text()
        ).toEqual('NameClick to sort in descending order');
      });
    });
  });
});
