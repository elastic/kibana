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

import { FlowDirection } from '../../../../graphql/types';
import { mockGlobalState, TestProviders } from '../../../../mock';
import { createStore, networkModel, State } from '../../../../store';

import { NetworkTopNFlowTable, NetworkTopNFlowTableId } from '.';
import { mockData } from './mock';

describe('NetworkTopNFlow Table Component', () => {
  const startDate = new Date('2019-01-08T16:31:10.707Z').valueOf();
  const loadMore = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default NetworkTopNFlow table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <NetworkTopNFlowTable
            loading={false}
            data={mockData.NetworkTopNFlow.edges}
            totalCount={mockData.NetworkTopNFlow.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.NetworkTopNFlow.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.NetworkTopNFlow.pageInfo)!}
            loadMore={loadMore}
            startDate={startDate}
            type={networkModel.NetworkType.page}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('Direction', () => {
    test('when you click on the bi-direction button, it get selected', () => {
      const event = {
        target: { name: 'direction', value: FlowDirection.biDirectional },
      };

      const wrapper = mount(
        <MockedProvider>
          <TestProviders store={store}>
            <NetworkTopNFlowTable
              loading={false}
              data={mockData.NetworkTopNFlow.edges}
              totalCount={mockData.NetworkTopNFlow.totalCount}
              hasNextPage={getOr(false, 'hasNextPage', mockData.NetworkTopNFlow.pageInfo)!}
              nextCursor={getOr(null, 'endCursor.value', mockData.NetworkTopNFlow.pageInfo)!}
              loadMore={loadMore}
              startDate={startDate}
              type={networkModel.NetworkType.page}
            />
          </TestProviders>
        </MockedProvider>
      );

      wrapper
        .find('input[value="biDirectional"]')
        .first()
        .simulate('change', event);

      wrapper.update();

      expect(
        wrapper
          .find(`button#${NetworkTopNFlowTableId}-select-direction-biDirectional`)
          .hasClass('euiButton--fill')
      ).toEqual(true);
    });
  });

  describe('Sorting by type', () => {
    test('when you click on the sorting dropdown, and picked destination', () => {
      const wrapper = mount(
        <MockedProvider>
          <TestProviders store={store}>
            <NetworkTopNFlowTable
              loading={false}
              data={mockData.NetworkTopNFlow.edges}
              totalCount={mockData.NetworkTopNFlow.totalCount}
              hasNextPage={getOr(false, 'hasNextPage', mockData.NetworkTopNFlow.pageInfo)!}
              nextCursor={getOr(null, 'endCursor.value', mockData.NetworkTopNFlow.pageInfo)!}
              loadMore={loadMore}
              startDate={startDate}
              type={networkModel.NetworkType.page}
            />
          </TestProviders>
        </MockedProvider>
      );

      wrapper
        .find(`[data-test-subj="${NetworkTopNFlowTableId}-select-type"] button`)
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`button#${NetworkTopNFlowTableId}-select-type-destination`)
        .first()
        .simulate('click');

      expect(
        wrapper
          .find(`[data-test-subj="${NetworkTopNFlowTableId}-select-type"] button`)
          .first()
          .text()
          .toLocaleLowerCase()
      ).toEqual('by destination ip');
    });
  });

  describe('Sorting on Table', () => {
    test('when you click on the column header, you should show the sorting icon', () => {
      const wrapper = mount(
        <MockedProvider>
          <TestProviders store={store}>
            <NetworkTopNFlowTable
              loading={false}
              data={mockData.NetworkTopNFlow.edges}
              totalCount={mockData.NetworkTopNFlow.totalCount}
              hasNextPage={getOr(false, 'hasNextPage', mockData.NetworkTopNFlow.pageInfo)!}
              nextCursor={getOr(null, 'endCursor.value', mockData.NetworkTopNFlow.pageInfo)!}
              loadMore={loadMore}
              startDate={startDate}
              type={networkModel.NetworkType.page}
            />
          </TestProviders>
        </MockedProvider>
      );
      expect(store.getState().network.page.queries!.topNFlow.topNFlowSort).toEqual({
        direction: 'desc',
        field: 'bytes',
      });

      wrapper
        .find('.euiTable thead tr th button')
        .at(1)
        .simulate('click');

      wrapper.update();

      expect(store.getState().network.page.queries!.topNFlow.topNFlowSort).toEqual({
        direction: 'asc',
        field: 'packets',
      });
      expect(
        wrapper
          .find('.euiTable thead tr th button')
          .first()
          .text()
      ).toEqual('BytesClick to sort in ascending order');
      expect(
        wrapper
          .find('.euiTable thead tr th button')
          .at(1)
          .text()
      ).toEqual('PacketsClick to sort in descending order');
      expect(
        wrapper
          .find('.euiTable thead tr th button')
          .at(1)
          .find('svg')
      ).toBeTruthy();
    });
  });
});
