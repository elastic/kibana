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
import { mockIndexPattern, mockGlobalState, TestProviders } from '../../../../mock';
import { createStore, networkModel, State } from '../../../../store';

import { DomainsTable } from '.';
import { mockDomainsData } from './mock';

describe('Domains Table Component', () => {
  const loadMore = jest.fn();
  const ip = '10.10.10.10';
  const state: State = mockGlobalState;

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('Rendering', () => {
    test('it renders the default Domains table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <DomainsTable
            indexPattern={mockIndexPattern}
            ip={ip}
            totalCount={1}
            loading={false}
            loadMore={loadMore}
            data={mockDomainsData.edges}
            flowTarget={FlowTarget.source}
            hasNextPage={getOr(false, 'hasNextPage', mockDomainsData.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockDomainsData.pageInfo)}
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
            <DomainsTable
              indexPattern={mockIndexPattern}
              ip={ip}
              totalCount={1}
              loading={false}
              loadMore={loadMore}
              data={mockDomainsData.edges}
              flowTarget={FlowTarget.source}
              hasNextPage={getOr(false, 'hasNextPage', mockDomainsData.pageInfo)!}
              nextCursor={getOr(null, 'endCursor.value', mockDomainsData.pageInfo)}
              type={networkModel.NetworkType.details}
            />
          </TestProviders>
        </MockedProvider>
      );
      expect(store.getState().network.details.queries!.domains.domainsSortField).toEqual({
        direction: 'desc',
        field: 'bytes',
      });

      wrapper
        .find('.euiTable thead tr th button')
        .at(1)
        .simulate('click');

      wrapper.update();

      expect(store.getState().network.details.queries!.domains.domainsSortField).toEqual({
        direction: 'asc',
        field: 'bytes',
      });
      expect(
        wrapper
          .find('.euiTable thead tr th button')
          .first()
          .text()
      ).toEqual('Domain NameClick to sort in ascending order');
      expect(
        wrapper
          .find('.euiTable thead tr th button')
          .at(1)
          .text()
      ).toEqual('BytesClick to sort in descending order');
      expect(
        wrapper
          .find('.euiTable thead tr th button')
          .at(1)
          .find('svg')
      ).toBeTruthy();
    });
  });
});
