/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { getOr } from 'lodash/fp';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { mockGlobalState } from '../../../../mock';
import { createStore, hostsModel, State } from '../../../../store';
import { DragDropContextWrapper } from '../../../drag_and_drop/drag_drop_context_wrapper';
import { getEmptyValue } from '../../../empty_value';
import { UncommonProcessTable } from './index';
import { mockData } from './mock';

describe('UncommonProcess Table Component', () => {
  const loadMore = jest.fn();
  const state: State = mockGlobalState;

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the default Uncommon process table', () => {
      const wrapper = shallow(
        <ReduxStoreProvider store={store}>
          <UncommonProcessTable
            loading={false}
            data={mockData.UncommonProcess.edges}
            totalCount={mockData.UncommonProcess.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.UncommonProcess.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.UncommonProcess.pageInfo)!}
            loadMore={loadMore}
            startDate={1546965070707}
            type={hostsModel.HostsType.page}
          />
        </ReduxStoreProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it has a double dash (empty value) without any hosts at all', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <DragDropContextWrapper>
            <UncommonProcessTable
              loading={false}
              data={mockData.UncommonProcess.edges}
              totalCount={mockData.UncommonProcess.totalCount}
              hasNextPage={getOr(false, 'hasNextPage', mockData.UncommonProcess.pageInfo)!}
              nextCursor={getOr(null, 'endCursor.value', mockData.UncommonProcess.pageInfo)!}
              loadMore={loadMore}
              startDate={1546965070707}
            />
          </DragDropContextWrapper>
        </ReduxStoreProvider>
      );

      expect(
        wrapper
          .find('[data-header="Hosts"]')
          .at(0)
          .text()
      ).toBe(getEmptyValue());
    });

    test('it has a single host without any extra comma when the number of hosts exactly 1', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <DragDropContextWrapper>
            <UncommonProcessTable
              loading={false}
              data={mockData.UncommonProcess.edges}
              totalCount={mockData.UncommonProcess.totalCount}
              hasNextPage={getOr(false, 'hasNextPage', mockData.UncommonProcess.pageInfo)!}
              nextCursor={getOr(null, 'endCursor.value', mockData.UncommonProcess.pageInfo)!}
              loadMore={loadMore}
              startDate={1546965070707}
            />
          </DragDropContextWrapper>
        </ReduxStoreProvider>
      );

      expect(
        wrapper
          .find('[data-header="Hosts"]')
          .at(1)
          .text()
      ).toBe('hello-world');
    });

    test('it has a comma separated list of hosts when the number of hosts is greater than 1', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <DragDropContextWrapper>
            <UncommonProcessTable
              loading={false}
              data={mockData.UncommonProcess.edges}
              totalCount={mockData.UncommonProcess.totalCount}
              hasNextPage={getOr(false, 'hasNextPage', mockData.UncommonProcess.pageInfo)!}
              nextCursor={getOr(null, 'endCursor.value', mockData.UncommonProcess.pageInfo)!}
              loadMore={loadMore}
              startDate={1546965070707}
            />
          </DragDropContextWrapper>
        </ReduxStoreProvider>
      );

      expect(
        wrapper
          .find('[data-header="Hosts"]')
          .at(2)
          .text()
      ).toBe('hello-world, hello-world2');
    });
  });
});
