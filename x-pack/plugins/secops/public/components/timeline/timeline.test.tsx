/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { noop, pick } from 'lodash/fp';
import * as React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import { DragDropContext } from 'react-beautiful-dnd';

import { Provider as ReduxStoreProvider } from 'react-redux';
import { eventsQuery } from '../../containers/events/index.gql_query';
import { mockECSData } from '../../mock/mock_ecs';
import { createStore, State } from '../../store';
import { DEFAULT_PAGE_COUNT } from '../../store/local/timeline/model';
import { flyoutHeaderHeight } from '../flyout';
import { defaultWidth } from './body';
import { ColumnHeaderType } from './body/column_headers/column_header';
import { headers } from './body/column_headers/headers';
import { columnRenderers, rowRenderers } from './body/renderers';
import { Sort } from './body/sort';
import { mockDataProviders } from './data_providers/mock/mock_data_providers';
import { Timeline } from './timeline';

const testFlyoutHeight = 980;

describe('Timeline', () => {
  const sort: Sort = {
    columnId: 'timestamp',
    sortDirection: 'descending',
  };

  const mocks = [
    {
      request: { query: eventsQuery },
      result: {
        data: {
          events: mockECSData,
        },
      },
    },
  ];

  const state: State = {
    local: {
      app: {
        notesById: {},
        theme: 'dark',
      },
      hosts: {
        limit: 2,
      },
      uncommonProcesses: {
        limit: 0,
        upperLimit: 0,
      },
      inputs: {
        global: {
          timerange: {
            kind: 'absolute',
            from: 0,
            to: 1,
          },
          query: [],
          policy: {
            kind: 'manual',
            duration: 5000,
          },
        },
      },
      dragAndDrop: {
        dataProviders: {},
      },
      timeline: {
        timelineById: {
          test: {
            activePage: 0,
            dataProviders: [],
            description: '',
            eventIdToNoteIds: {},
            historyIds: [],
            id: 'test',
            isFavorite: false,
            isLive: false,
            itemsPerPage: 25,
            itemsPerPageOptions: [10, 25, 50],
            kqlMode: 'filter',
            kqlQuery: '',
            title: '',
            noteIds: [],
            pageCount: DEFAULT_PAGE_COUNT,
            pinnedEventIds: {},
            range: '1 Day',
            show: false,
            sort: {
              columnId: 'timestamp',
              sortDirection: 'descending',
            },
            width: defaultWidth,
          },
        },
      },
    },
  };

  let store = createStore(state);

  beforeEach(() => {
    store = createStore(state);
  });

  describe('rendering', () => {
    test('it renders the timeline header', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <MockedProvider mocks={mocks}>
              <Timeline
                id="foo"
                activePage={0}
                columnHeaders={headers}
                columnRenderers={columnRenderers}
                dataProviders={mockDataProviders}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                onChangeItemsPerPage={noop}
                onChangePage={noop}
                onColumnSorted={noop}
                onDataProviderRemoved={noop}
                onFilterChange={noop}
                onRangeSelected={noop}
                onToggleDataProviderEnabled={noop}
                pageCount={DEFAULT_PAGE_COUNT}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                show={true}
                sort={sort}
                theme="dark"
              />
            </MockedProvider>
          </DragDropContext>
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="timelineHeader"]').exists()).toEqual(true);
    });

    test('it renders the timeline body', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <MockedProvider mocks={mocks}>
              <Timeline
                id="foo"
                activePage={0}
                columnHeaders={headers}
                columnRenderers={columnRenderers}
                dataProviders={mockDataProviders}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                onChangeItemsPerPage={noop}
                onChangePage={noop}
                onColumnSorted={noop}
                onDataProviderRemoved={noop}
                onFilterChange={noop}
                onRangeSelected={noop}
                onToggleDataProviderEnabled={noop}
                pageCount={100}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                show={true}
                sort={sort}
                theme="dark"
              />
            </MockedProvider>
          </DragDropContext>
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="scrollableArea"]').exists()).toEqual(true);
    });

    test('it renders the paging footer when you have data', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <MockedProvider mocks={mocks}>
              <Timeline
                id="foo"
                activePage={0}
                columnHeaders={headers}
                columnRenderers={columnRenderers}
                dataProviders={mockDataProviders}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                onChangeItemsPerPage={noop}
                onChangePage={noop}
                onColumnSorted={noop}
                onDataProviderRemoved={noop}
                onFilterChange={noop}
                onRangeSelected={noop}
                onToggleDataProviderEnabled={noop}
                pageCount={DEFAULT_PAGE_COUNT}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                show={true}
                sort={sort}
                theme="dark"
              />
            </MockedProvider>
          </DragDropContext>
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="table-pagination"]').exists()).toEqual(true);
    });

    test('it does NOT render the paging footer when you do NOT have any data providers', () => {
      const wrapper = mount(
        <ReduxStoreProvider store={store}>
          <DragDropContext onDragEnd={noop}>
            <MockedProvider mocks={mocks}>
              <Timeline
                id="foo"
                activePage={0}
                columnHeaders={headers}
                columnRenderers={columnRenderers}
                dataProviders={[]}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                onChangeItemsPerPage={noop}
                onChangePage={noop}
                onColumnSorted={noop}
                onDataProviderRemoved={noop}
                onFilterChange={noop}
                onRangeSelected={noop}
                onToggleDataProviderEnabled={noop}
                pageCount={DEFAULT_PAGE_COUNT}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                show={true}
                sort={sort}
                theme="dark"
              />
            </MockedProvider>
          </DragDropContext>
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="table-pagination"]').exists()).toEqual(false);
    });
  });

  describe('event wire up', () => {
    describe('onColumnSorted', () => {
      test('it invokes the onColumnSorted callback when a header is clicked', () => {
        const mockOnColumnSorted = jest.fn();

        const wrapper = mount(
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <MockedProvider mocks={mocks}>
                <Timeline
                  id="foo"
                  activePage={0}
                  columnHeaders={headers}
                  columnRenderers={columnRenderers}
                  dataProviders={mockDataProviders}
                  flyoutHeight={testFlyoutHeight}
                  flyoutHeaderHeight={flyoutHeaderHeight}
                  itemsPerPage={5}
                  itemsPerPageOptions={[5, 10, 20]}
                  onColumnSorted={mockOnColumnSorted}
                  onChangeItemsPerPage={noop}
                  onChangePage={noop}
                  onDataProviderRemoved={noop}
                  onFilterChange={noop}
                  onRangeSelected={noop}
                  onToggleDataProviderEnabled={noop}
                  pageCount={DEFAULT_PAGE_COUNT}
                  range={'1 Day'}
                  rowRenderers={rowRenderers}
                  show={true}
                  sort={sort}
                  theme="dark"
                />
              </MockedProvider>
            </DragDropContext>
          </ReduxStoreProvider>
        );

        wrapper
          .find('[data-test-subj="header"]')
          .first()
          .simulate('click');

        expect(mockOnColumnSorted).toBeCalledWith({
          columnId: headers[0].id,
          sortDirection: 'ascending',
        });
      });
    });

    describe('onDataProviderRemoved', () => {
      test('it invokes the onDataProviderRemoved callback when the close button on a provider is clicked', () => {
        const mockOnDataProviderRemoved = jest.fn();

        const wrapper = mount(
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <MockedProvider mocks={mocks}>
                <Timeline
                  id="foo"
                  activePage={0}
                  columnHeaders={headers}
                  columnRenderers={columnRenderers}
                  dataProviders={mockDataProviders}
                  flyoutHeight={testFlyoutHeight}
                  flyoutHeaderHeight={flyoutHeaderHeight}
                  itemsPerPage={5}
                  itemsPerPageOptions={[5, 10, 20]}
                  onChangeItemsPerPage={noop}
                  onChangePage={noop}
                  onColumnSorted={noop}
                  onDataProviderRemoved={mockOnDataProviderRemoved}
                  onFilterChange={noop}
                  onRangeSelected={noop}
                  onToggleDataProviderEnabled={noop}
                  pageCount={DEFAULT_PAGE_COUNT}
                  range={'1 Day'}
                  rowRenderers={rowRenderers}
                  show={true}
                  sort={sort}
                  theme="dark"
                />
              </MockedProvider>
            </DragDropContext>
          </ReduxStoreProvider>
        );

        wrapper
          .find('[data-test-subj="closeButton"]')
          .first()
          .simulate('click');

        const callbackParams = pick(
          ['enabled', 'id', 'name', 'negated'],
          mockOnDataProviderRemoved.mock.calls[0][0]
        );

        expect(callbackParams).toEqual({
          enabled: true,
          id: 'id-Provider 1',
          name: 'Provider 1',
          negated: false,
        });
      });
    });

    describe('onFilterChange', () => {
      test('it invokes the onFilterChange callback when the input is updated', () => {
        const newFilter = 'changed';
        const mockOnFilterChange = jest.fn();

        // for this test, all columns have text filters
        const allColumnsHaveTextFilters = headers.map(header => ({
          ...header,
          columnHeaderType: 'text-filter' as ColumnHeaderType,
        }));

        const wrapper = mount(
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <MockedProvider mocks={mocks}>
                <Timeline
                  id="foo"
                  activePage={0}
                  columnHeaders={allColumnsHaveTextFilters}
                  columnRenderers={columnRenderers}
                  dataProviders={mockDataProviders}
                  flyoutHeight={testFlyoutHeight}
                  flyoutHeaderHeight={flyoutHeaderHeight}
                  itemsPerPage={5}
                  itemsPerPageOptions={[5, 10, 20]}
                  onChangeItemsPerPage={noop}
                  onChangePage={noop}
                  onColumnSorted={noop}
                  onDataProviderRemoved={noop}
                  onFilterChange={mockOnFilterChange}
                  onRangeSelected={noop}
                  onToggleDataProviderEnabled={noop}
                  pageCount={DEFAULT_PAGE_COUNT}
                  range={'1 Day'}
                  rowRenderers={rowRenderers}
                  show={true}
                  sort={sort}
                  theme="dark"
                />
              </MockedProvider>
            </DragDropContext>
          </ReduxStoreProvider>
        );

        wrapper
          .find('[data-test-subj="textFilter"]')
          .at(2)
          .simulate('change', { target: { value: newFilter } });

        expect(mockOnFilterChange).toBeCalledWith({
          columnId: headers[0].id,
          filter: newFilter,
        });
      });
    });

    describe('onToggleDataProviderEnabled', () => {
      test('it invokes the onToggleDataProviderEnabled callback when the input is updated', () => {
        const mockOnToggleDataProviderEnabled = jest.fn();

        // for this test, all columns have text filters
        const allColumnsHaveTextFilters = headers.map(header => ({
          ...header,
          columnHeaderType: 'text-filter' as ColumnHeaderType,
        }));

        const wrapper = mount(
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <MockedProvider mocks={mocks}>
                <Timeline
                  id="foo"
                  activePage={0}
                  columnHeaders={allColumnsHaveTextFilters}
                  columnRenderers={columnRenderers}
                  dataProviders={mockDataProviders}
                  flyoutHeight={testFlyoutHeight}
                  flyoutHeaderHeight={flyoutHeaderHeight}
                  itemsPerPage={5}
                  itemsPerPageOptions={[5, 10, 20]}
                  onChangeItemsPerPage={noop}
                  onChangePage={noop}
                  onColumnSorted={noop}
                  onDataProviderRemoved={noop}
                  onFilterChange={noop}
                  onRangeSelected={noop}
                  onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
                  pageCount={DEFAULT_PAGE_COUNT}
                  range={'1 Day'}
                  rowRenderers={rowRenderers}
                  show={true}
                  sort={sort}
                  theme="dark"
                />
              </MockedProvider>
            </DragDropContext>
          </ReduxStoreProvider>
        );

        wrapper
          .find('[data-test-subj="switchButton"]')
          .at(1)
          .simulate('click');

        const callbackParams = pick(
          ['enabled', 'dataProvider.id', 'dataProvider.name', 'dataProvider.negated'],
          mockOnToggleDataProviderEnabled.mock.calls[0][0]
        );

        expect(callbackParams).toEqual({
          dataProvider: {
            name: 'Provider 1',
            negated: false,
            id: 'id-Provider 1',
          },
          enabled: false,
        });
      });
    });

    describe('onChangeItemsPerPage', () => {
      test('it invokes the onChangeItemsPerPage callback when the input is updated', () => {
        const onChangeItemsPerPage = jest.fn();

        const wrapper = mount(
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <MockedProvider mocks={mocks}>
                <Timeline
                  id="foo"
                  activePage={0}
                  columnHeaders={headers}
                  columnRenderers={columnRenderers}
                  dataProviders={mockDataProviders}
                  flyoutHeight={testFlyoutHeight}
                  flyoutHeaderHeight={flyoutHeaderHeight}
                  itemsPerPage={5}
                  itemsPerPageOptions={[5, 10, 20]}
                  onChangeItemsPerPage={onChangeItemsPerPage}
                  onChangePage={noop}
                  onColumnSorted={noop}
                  onDataProviderRemoved={noop}
                  onFilterChange={noop}
                  onRangeSelected={noop}
                  onToggleDataProviderEnabled={noop}
                  pageCount={DEFAULT_PAGE_COUNT}
                  range={'1 Day'}
                  rowRenderers={rowRenderers}
                  show={true}
                  sort={sort}
                  theme="dark"
                />
              </MockedProvider>
            </DragDropContext>
          </ReduxStoreProvider>
        );

        wrapper
          .find('[data-test-subj="table-pagination"] button')
          .at(0)
          .simulate('click');

        wrapper.update();

        wrapper
          .find('.euiContextMenuItem')
          .at(0)
          .simulate('click');

        expect(onChangeItemsPerPage.mock.calls[0][0]).toEqual(5);
      });
    });

    describe('onChangePage', () => {
      test('it invokes the onChangePage callback when the input is updated', () => {
        const onChangePage = jest.fn();
        const wrapper = mount(
          <ReduxStoreProvider store={store}>
            <DragDropContext onDragEnd={noop}>
              <MockedProvider mocks={mocks}>
                <Timeline
                  id="foo"
                  activePage={0}
                  columnHeaders={headers}
                  columnRenderers={columnRenderers}
                  dataProviders={mockDataProviders}
                  flyoutHeight={testFlyoutHeight}
                  flyoutHeaderHeight={flyoutHeaderHeight}
                  itemsPerPage={5}
                  itemsPerPageOptions={[5, 10, 20]}
                  onChangeItemsPerPage={noop}
                  onChangePage={onChangePage}
                  onColumnSorted={noop}
                  onDataProviderRemoved={noop}
                  onFilterChange={noop}
                  onRangeSelected={noop}
                  onToggleDataProviderEnabled={noop}
                  pageCount={DEFAULT_PAGE_COUNT}
                  range={'1 Day'}
                  rowRenderers={rowRenderers}
                  show={true}
                  sort={sort}
                  theme="dark"
                />
              </MockedProvider>
            </DragDropContext>
          </ReduxStoreProvider>
        );
        wrapper
          .find('[data-test-subj="pagination-button-0"]')
          .first()
          .simulate('click');
        expect(onChangePage.mock.calls[0][0]).toEqual(0);
      });
    });
  });
});
