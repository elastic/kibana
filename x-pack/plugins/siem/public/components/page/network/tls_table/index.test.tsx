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

import { apolloClientObservable, mockGlobalState, TestProviders } from '../../../../mock';
import { createStore, networkModel, State } from '../../../../store';

import { TlsTable } from '.';
import { mockTlsData } from './mock';

describe('Tls Table Component', () => {
  const loadMore = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });

  describe('Rendering', () => {
    test('it renders the default Domains table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <TlsTable
            totalCount={1}
            loading={false}
            loadMore={loadMore}
            data={mockTlsData.edges}
            hasNextPage={getOr(false, 'hasNextPage', mockTlsData.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockTlsData.pageInfo)}
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
            <TlsTable
              totalCount={1}
              loading={false}
              loadMore={loadMore}
              data={mockTlsData.edges}
              hasNextPage={getOr(false, 'hasNextPage', mockTlsData.pageInfo)!}
              nextCursor={getOr(null, 'endCursor.value', mockTlsData.pageInfo)}
              type={networkModel.NetworkType.details}
            />
          </TestProviders>
        </MockedProvider>
      );
      expect(store.getState().network.details.queries!.tls.tlsSortField).toEqual({
        direction: 'desc',
        field: '_id',
      });

      wrapper
        .find('.euiTable thead tr th button')
        .first()
        .simulate('click');

      wrapper.update();

      expect(store.getState().network.details.queries!.tls.tlsSortField).toEqual({
        direction: 'asc',
        field: '_id',
      });

      expect(
        wrapper
          .find('.euiTable thead tr th button')
          .first()
          .text()
      ).toEqual('SHA1 FingerprintClick to sort in descending order');
    });
  });
});
