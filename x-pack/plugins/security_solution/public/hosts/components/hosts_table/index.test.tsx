/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { getOr } from 'lodash/fp';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import {
  apolloClientObservable,
  mockIndexPattern,
  mockGlobalState,
  TestProviders,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../../common/mock';
import { useMountAppended } from '../../../common/utils/use_mount_appended';
import { createStore, State } from '../../../common/store';
import { hostsModel } from '../../../hosts/store';
import { HostsTableType } from '../../../hosts/store/model';
import { HostsTable } from './index';
import { mockData } from './mock';

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));

jest.mock('../../../common/components/link_to');

describe('Hosts Table', () => {
  const loadPage = jest.fn();
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();

  let store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  );
  const mount = useMountAppended();

  beforeEach(() => {
    store = createStore(
      state,
      SUB_PLUGINS_REDUCER,
      apolloClientObservable,
      kibanaObservable,
      storage
    );
  });

  describe('rendering', () => {
    test('it renders the default Hosts table', () => {
      const wrapper = shallow(
        <TestProviders store={store}>
          <HostsTable
            data={mockData.Hosts.edges}
            id="hostsQuery"
            isInspect={false}
            indexPattern={mockIndexPattern}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.Hosts.pageInfo)}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', mockData.Hosts.pageInfo)}
            totalCount={mockData.Hosts.totalCount}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(wrapper.find('HostsTable')).toMatchSnapshot();
    });

    describe('Sorting on Table', () => {
      let wrapper: ReturnType<typeof mount>;

      beforeEach(() => {
        wrapper = mount(
          <MockedProvider>
            <TestProviders store={store}>
              <HostsTable
                id="hostsQuery"
                indexPattern={mockIndexPattern}
                isInspect={false}
                loading={false}
                data={mockData.Hosts.edges}
                totalCount={mockData.Hosts.totalCount}
                fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.Hosts.pageInfo)}
                showMorePagesIndicator={getOr(
                  false,
                  'showMorePagesIndicator',
                  mockData.Hosts.pageInfo
                )}
                loadPage={loadPage}
                type={hostsModel.HostsType.page}
              />
            </TestProviders>
          </MockedProvider>
        );
      });
      test('Initial value of the store', () => {
        expect(store.getState().hosts.page.queries[HostsTableType.hosts]).toEqual({
          activePage: 0,
          direction: 'desc',
          sortField: 'lastSeen',
          limit: 10,
        });
        expect(wrapper.find('.euiTable thead tr th button').at(1).text()).toEqual(
          'Last seen Click to sort in ascending order'
        );
        expect(wrapper.find('.euiTable thead tr th button').at(1).find('svg')).toBeTruthy();
      });

      test('when you click on the column header, you should show the sorting icon', () => {
        wrapper.find('.euiTable thead tr th button').first().simulate('click');

        wrapper.update();

        expect(store.getState().hosts.page.queries[HostsTableType.hosts]).toEqual({
          activePage: 0,
          direction: 'asc',
          sortField: 'hostName',
          limit: 10,
        });
        expect(wrapper.find('.euiTable thead tr th button').first().text()).toEqual(
          'Host nameClick to sort in descending order'
        );
      });
    });
  });
});
