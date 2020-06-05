/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { getOr } from 'lodash/fp';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { FlowTargetSourceDest } from '../../../graphql/types';
import {
  apolloClientObservable,
  mockGlobalState,
  mockIndexPattern,
  TestProviders,
  SUB_PLUGINS_REDUCER,
} from '../../../common/mock';
import { useMountAppended } from '../../../common/utils/use_mount_appended';
import { createStore, State } from '../../../common/store';
import { networkModel } from '../../store';

import { NetworkTopCountriesTable } from '.';
import { mockData } from './mock';

describe('NetworkTopCountries Table Component', () => {
  const loadPage = jest.fn();
  const state: State = mockGlobalState;
  const mount = useMountAppended();

  let store = createStore(state, SUB_PLUGINS_REDUCER, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, apolloClientObservable);
  });

  describe('rendering', () => {
    test('it renders the default NetworkTopCountries table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <NetworkTopCountriesTable
            data={mockData.NetworkTopCountries.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.NetworkTopCountries.pageInfo)}
            flowTargeted={FlowTargetSourceDest.source}
            id="topCountriesSource"
            indexPattern={mockIndexPattern}
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.NetworkTopCountries.pageInfo
            )}
            totalCount={mockData.NetworkTopCountries.totalCount}
            type={networkModel.NetworkType.page}
          />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('Connect(NetworkTopCountriesTableComponent)')).toMatchSnapshot();
    });
    test('it renders the IP Details NetworkTopCountries table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <NetworkTopCountriesTable
            data={mockData.NetworkTopCountries.edges}
            fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.NetworkTopCountries.pageInfo)}
            flowTargeted={FlowTargetSourceDest.source}
            id="topCountriesSource"
            indexPattern={mockIndexPattern}
            isInspect={false}
            loading={false}
            loadPage={loadPage}
            showMorePagesIndicator={getOr(
              false,
              'showMorePagesIndicator',
              mockData.NetworkTopCountries.pageInfo
            )}
            totalCount={mockData.NetworkTopCountries.totalCount}
            type={networkModel.NetworkType.details}
          />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('Connect(NetworkTopCountriesTableComponent)')).toMatchSnapshot();
    });
  });

  describe('Sorting on Table', () => {
    test('when you click on the column header, you should show the sorting icon', () => {
      const wrapper = mount(
        <MockedProvider>
          <TestProviders store={store}>
            <NetworkTopCountriesTable
              data={mockData.NetworkTopCountries.edges}
              fakeTotalCount={getOr(50, 'fakeTotalCount', mockData.NetworkTopCountries.pageInfo)}
              flowTargeted={FlowTargetSourceDest.source}
              id="topCountriesSource"
              isInspect={false}
              indexPattern={mockIndexPattern}
              loading={false}
              loadPage={loadPage}
              showMorePagesIndicator={getOr(
                false,
                'showMorePagesIndicator',
                mockData.NetworkTopCountries.pageInfo
              )}
              totalCount={mockData.NetworkTopCountries.totalCount}
              type={networkModel.NetworkType.page}
            />
          </TestProviders>
        </MockedProvider>
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
      expect(wrapper.find('.euiTable thead tr th button').first().text()).toEqual(
        'Bytes inClick to sort in ascending order'
      );
      expect(wrapper.find('.euiTable thead tr th button').at(1).text()).toEqual(
        'Bytes outClick to sort in descending order'
      );
      expect(wrapper.find('.euiTable thead tr th button').at(1).find('svg')).toBeTruthy();
    });
  });
});
