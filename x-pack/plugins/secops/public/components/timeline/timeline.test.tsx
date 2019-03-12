/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import { eventsQuery } from '../../containers/events/index.gql_query';
import { Direction } from '../../graphql/types';
import { mockEcsData } from '../../mock';
import { mockIndexPattern } from '../../mock';
import { TestProviders } from '../../mock/test_providers';
import { flyoutHeaderHeight } from '../flyout';

import { ColumnHeaderType } from './body/column_headers/column_header';
import { defaultHeaders } from './body/column_headers/default_headers';
import { columnRenderers, rowRenderers } from './body/renderers';
import { Sort } from './body/sort';
import { mockDataProviders } from './data_providers/mock/mock_data_providers';
import { Timeline } from './timeline';

const testFlyoutHeight = 980;
const mockGetNotesByIds = (eventId: string[]) => [];

describe('Timeline', () => {
  const sort: Sort = {
    columnId: '@timestamp',
    sortDirection: Direction.descending,
  };

  const indexPattern = mockIndexPattern;

  const mocks = [
    {
      request: { query: eventsQuery },
      result: {
        data: {
          events: mockEcsData,
        },
      },
    },
  ];

  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <Timeline
          addNoteToEvent={jest.fn()}
          id="foo"
          columnHeaders={defaultHeaders}
          columnRenderers={columnRenderers}
          dataProviders={mockDataProviders}
          eventIdToNoteIds={{}}
          flyoutHeight={testFlyoutHeight}
          flyoutHeaderHeight={flyoutHeaderHeight}
          getNotesByIds={mockGetNotesByIds}
          indexPattern={indexPattern}
          itemsPerPage={5}
          itemsPerPageOptions={[5, 10, 20]}
          kqlMode="search"
          kqlQuery=""
          onChangeDataProviderKqlQuery={jest.fn()}
          onChangeDroppableAndProvider={jest.fn()}
          onChangeItemsPerPage={jest.fn()}
          onColumnResized={jest.fn()}
          onColumnRemoved={jest.fn()}
          onColumnSorted={jest.fn()}
          onDataProviderRemoved={jest.fn()}
          onFilterChange={jest.fn()}
          onPinEvent={jest.fn()}
          onRangeSelected={jest.fn()}
          onToggleDataProviderEnabled={jest.fn()}
          onToggleDataProviderExcluded={jest.fn()}
          onUnPinEvent={jest.fn()}
          pinnedEventIds={{}}
          range={'1 Day'}
          rowRenderers={rowRenderers}
          show={true}
          sort={sort}
          updateNote={jest.fn()}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the timeline header', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <Timeline
              addNoteToEvent={jest.fn()}
              id="foo"
              columnHeaders={defaultHeaders}
              columnRenderers={columnRenderers}
              dataProviders={mockDataProviders}
              eventIdToNoteIds={{}}
              flyoutHeight={testFlyoutHeight}
              flyoutHeaderHeight={flyoutHeaderHeight}
              getNotesByIds={mockGetNotesByIds}
              indexPattern={indexPattern}
              itemsPerPage={5}
              itemsPerPageOptions={[5, 10, 20]}
              kqlMode="search"
              kqlQuery=""
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onChangeItemsPerPage={jest.fn()}
              onColumnResized={jest.fn()}
              onColumnRemoved={jest.fn()}
              onColumnSorted={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onFilterChange={jest.fn()}
              onPinEvent={jest.fn()}
              onRangeSelected={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
              onUnPinEvent={jest.fn()}
              pinnedEventIds={{}}
              range={'1 Day'}
              rowRenderers={rowRenderers}
              show={true}
              sort={sort}
              updateNote={jest.fn()}
            />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timelineHeader"]').exists()).toEqual(true);
    });

    test('it renders the timeline body', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <Timeline
              addNoteToEvent={jest.fn()}
              id="foo"
              columnHeaders={defaultHeaders}
              columnRenderers={columnRenderers}
              dataProviders={mockDataProviders}
              eventIdToNoteIds={{}}
              flyoutHeight={testFlyoutHeight}
              flyoutHeaderHeight={flyoutHeaderHeight}
              getNotesByIds={mockGetNotesByIds}
              indexPattern={indexPattern}
              itemsPerPage={5}
              itemsPerPageOptions={[5, 10, 20]}
              kqlMode="search"
              kqlQuery=""
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onChangeItemsPerPage={jest.fn()}
              onColumnRemoved={jest.fn()}
              onColumnResized={jest.fn()}
              onColumnSorted={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onFilterChange={jest.fn()}
              onPinEvent={jest.fn()}
              onRangeSelected={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
              onUnPinEvent={jest.fn()}
              pinnedEventIds={{}}
              range={'1 Day'}
              rowRenderers={rowRenderers}
              show={true}
              sort={sort}
              updateNote={jest.fn()}
            />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="horizontal-scroll"]').exists()).toEqual(true);
    });

    test('it does NOT render the paging footer when you do NOT have any data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <Timeline
              addNoteToEvent={jest.fn()}
              id="foo"
              columnHeaders={defaultHeaders}
              columnRenderers={columnRenderers}
              dataProviders={mockDataProviders}
              eventIdToNoteIds={{}}
              flyoutHeight={testFlyoutHeight}
              flyoutHeaderHeight={flyoutHeaderHeight}
              getNotesByIds={mockGetNotesByIds}
              indexPattern={indexPattern}
              itemsPerPage={5}
              itemsPerPageOptions={[5, 10, 20]}
              kqlMode="search"
              kqlQuery=""
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onChangeItemsPerPage={jest.fn()}
              onColumnRemoved={jest.fn()}
              onColumnResized={jest.fn()}
              onColumnSorted={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onFilterChange={jest.fn()}
              onPinEvent={jest.fn()}
              onRangeSelected={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
              onUnPinEvent={jest.fn()}
              pinnedEventIds={{}}
              range={'1 Day'}
              rowRenderers={rowRenderers}
              show={true}
              sort={sort}
              updateNote={jest.fn()}
            />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="table-pagination"]').exists()).toEqual(false);
    });
  });

  describe('event wire up', () => {
    describe('onDataProviderRemoved', () => {
      test('it invokes the onDataProviderRemoved callback when the delete button on a provider is clicked', () => {
        const mockOnDataProviderRemoved = jest.fn();

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <Timeline
                addNoteToEvent={jest.fn()}
                id="foo"
                columnHeaders={defaultHeaders}
                columnRenderers={columnRenderers}
                dataProviders={mockDataProviders}
                eventIdToNoteIds={{}}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                getNotesByIds={mockGetNotesByIds}
                indexPattern={indexPattern}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQuery=""
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onColumnRemoved={jest.fn()}
                onColumnResized={jest.fn()}
                onColumnSorted={jest.fn()}
                onDataProviderRemoved={mockOnDataProviderRemoved}
                onFilterChange={jest.fn()}
                onPinEvent={jest.fn()}
                onRangeSelected={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
                onUnPinEvent={jest.fn()}
                pinnedEventIds={{}}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                show={true}
                sort={sort}
                updateNote={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="providerBadge"] svg')
          .first()
          .simulate('click');

        expect(mockOnDataProviderRemoved.mock.calls[0][0]).toEqual('id-Provider 1');
      });

      test('it invokes the onDataProviderRemoved callback when you click on the option "Delete" in the provider menu', () => {
        const mockOnDataProviderRemoved = jest.fn();

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <Timeline
                addNoteToEvent={jest.fn()}
                id="foo"
                columnHeaders={defaultHeaders}
                columnRenderers={columnRenderers}
                dataProviders={mockDataProviders}
                eventIdToNoteIds={{}}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                getNotesByIds={mockGetNotesByIds}
                indexPattern={indexPattern}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQuery=""
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onColumnRemoved={jest.fn()}
                onColumnResized={jest.fn()}
                onColumnSorted={jest.fn()}
                onDataProviderRemoved={mockOnDataProviderRemoved}
                onFilterChange={jest.fn()}
                onPinEvent={jest.fn()}
                onRangeSelected={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
                onUnPinEvent={jest.fn()}
                pinnedEventIds={{}}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                show={true}
                sort={sort}
                updateNote={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );
        wrapper
          .find('[data-test-subj="providerBadge"]')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find('[data-test-subj="providerActions"] button.euiContextMenuItem')
          .at(2)
          .simulate('click');

        expect(mockOnDataProviderRemoved.mock.calls[0][0]).toEqual('id-Provider 1');
      });
    });

    describe('onFilterChange', () => {
      test('it invokes the onFilterChange callback when the input is updated', () => {
        const newFilter = 'changed';
        const mockOnFilterChange = jest.fn();

        // for this test, all columns have text filters
        const allColumnsHaveTextFilters = defaultHeaders.map(header => ({
          ...header,
          columnHeaderType: 'text-filter' as ColumnHeaderType,
        }));

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <Timeline
                addNoteToEvent={jest.fn()}
                id="foo"
                columnHeaders={allColumnsHaveTextFilters}
                columnRenderers={columnRenderers}
                dataProviders={mockDataProviders}
                eventIdToNoteIds={{}}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                getNotesByIds={mockGetNotesByIds}
                indexPattern={indexPattern}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQuery=""
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onColumnRemoved={jest.fn()}
                onColumnResized={jest.fn()}
                onColumnSorted={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onFilterChange={mockOnFilterChange}
                onPinEvent={jest.fn()}
                onRangeSelected={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
                onUnPinEvent={jest.fn()}
                pinnedEventIds={{}}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                show={true}
                sort={sort}
                updateNote={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="textFilter"]')
          .at(2)
          .simulate('change', { target: { value: newFilter } });

        expect(mockOnFilterChange).toBeCalledWith({
          columnId: defaultHeaders[0].id,
          filter: newFilter,
        });
      });
    });

    describe('onToggleDataProviderEnabled', () => {
      test('it invokes the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', () => {
        const mockOnToggleDataProviderEnabled = jest.fn();

        // for this test, all columns have text filters
        const allColumnsHaveTextFilters = defaultHeaders.map(header => ({
          ...header,
          columnHeaderType: 'text-filter' as ColumnHeaderType,
        }));

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <Timeline
                addNoteToEvent={jest.fn()}
                id="foo"
                columnHeaders={allColumnsHaveTextFilters}
                columnRenderers={columnRenderers}
                dataProviders={mockDataProviders}
                eventIdToNoteIds={{}}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                getNotesByIds={mockGetNotesByIds}
                indexPattern={indexPattern}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQuery=""
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onColumnRemoved={jest.fn()}
                onColumnResized={jest.fn()}
                onColumnSorted={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onFilterChange={jest.fn()}
                onPinEvent={jest.fn()}
                onRangeSelected={jest.fn()}
                onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
                onToggleDataProviderExcluded={jest.fn()}
                onUnPinEvent={jest.fn()}
                pinnedEventIds={{}}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                show={true}
                sort={sort}
                updateNote={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="providerBadge"]')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find('[data-test-subj="providerActions"] button.euiContextMenuItem')
          .at(1)
          .simulate('click');

        expect(mockOnToggleDataProviderEnabled.mock.calls[0][0]).toEqual({
          providerId: 'id-Provider 1',
          enabled: false,
        });
      });
    });

    describe('onToggleDataProviderExcluded', () => {
      test('it invokes the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', () => {
        const mockOnToggleDataProviderExcluded = jest.fn();

        // for this test, all columns have text filters
        const allColumnsHaveTextFilters = defaultHeaders.map(header => ({
          ...header,
          columnHeaderType: 'text-filter' as ColumnHeaderType,
        }));

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <Timeline
                addNoteToEvent={jest.fn()}
                id="foo"
                columnHeaders={allColumnsHaveTextFilters}
                columnRenderers={columnRenderers}
                dataProviders={mockDataProviders}
                eventIdToNoteIds={{}}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                getNotesByIds={mockGetNotesByIds}
                indexPattern={indexPattern}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQuery=""
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onColumnRemoved={jest.fn()}
                onColumnResized={jest.fn()}
                onColumnSorted={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onFilterChange={jest.fn()}
                onPinEvent={jest.fn()}
                onRangeSelected={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={mockOnToggleDataProviderExcluded}
                onUnPinEvent={jest.fn()}
                pinnedEventIds={{}}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                show={true}
                sort={sort}
                updateNote={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="providerBadge"]')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find('[data-test-subj="providerActions"] button.euiContextMenuItem')
          .first()
          .simulate('click');

        expect(mockOnToggleDataProviderExcluded.mock.calls[0][0]).toEqual({
          providerId: 'id-Provider 1',
          excluded: true,
        });
      });
    });

    describe('#ProviderWithAndProvider', () => {
      test('Rendering And Provider', () => {
        const dataProviders = mockDataProviders.slice(0, 1);
        dataProviders[0].and = mockDataProviders.slice(1, 3);

        // for this test, all columns have text filters
        const allColumnsHaveTextFilters = defaultHeaders.map(header => ({
          ...header,
          columnHeaderType: 'text-filter' as ColumnHeaderType,
        }));

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <Timeline
                addNoteToEvent={jest.fn()}
                id="foo"
                columnHeaders={allColumnsHaveTextFilters}
                columnRenderers={columnRenderers}
                dataProviders={dataProviders}
                eventIdToNoteIds={{}}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                getNotesByIds={mockGetNotesByIds}
                indexPattern={indexPattern}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQuery=""
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onColumnRemoved={jest.fn()}
                onColumnResized={jest.fn()}
                onColumnSorted={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onFilterChange={jest.fn()}
                onPinEvent={jest.fn()}
                onRangeSelected={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
                onUnPinEvent={jest.fn()}
                pinnedEventIds={{}}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                show={true}
                sort={sort}
                updateNote={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        const andProviderBadge = wrapper
          .find('[data-test-subj="andProviderButton"] span.euiBadge')
          .first();

        expect(andProviderBadge.text()).toEqual('2');
      });

      test('it invokes the onDataProviderRemoved callback when you click on the option "Delete" in the accordeon menu', () => {
        const dataProviders = mockDataProviders.slice(0, 1);
        dataProviders[0].and = mockDataProviders.slice(1, 3);
        const mockOnDataProviderRemoved = jest.fn();

        // for this test, all columns have text filters
        const allColumnsHaveTextFilters = defaultHeaders.map(header => ({
          ...header,
          columnHeaderType: 'text-filter' as ColumnHeaderType,
        }));

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <Timeline
                addNoteToEvent={jest.fn()}
                id="foo"
                columnHeaders={allColumnsHaveTextFilters}
                columnRenderers={columnRenderers}
                dataProviders={dataProviders}
                eventIdToNoteIds={{}}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                getNotesByIds={mockGetNotesByIds}
                indexPattern={indexPattern}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQuery=""
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onColumnRemoved={jest.fn()}
                onColumnResized={jest.fn()}
                onColumnSorted={jest.fn()}
                onDataProviderRemoved={mockOnDataProviderRemoved}
                onFilterChange={jest.fn()}
                onPinEvent={jest.fn()}
                onRangeSelected={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
                onUnPinEvent={jest.fn()}
                pinnedEventIds={{}}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                show={true}
                sort={sort}
                updateNote={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="andProviderButton"] span.euiBadge')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find('[data-test-subj="andProviderAccordion"] button.euiContextMenuItem')
          .at(2)
          .simulate('click');

        expect(mockOnDataProviderRemoved.mock.calls[0]).toEqual(['id-Provider 1', 'id-Provider 2']);
      });

      test('it invokes the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the accordeon menu', () => {
        const dataProviders = mockDataProviders.slice(0, 1);
        dataProviders[0].and = mockDataProviders.slice(1, 3);
        const mockOnToggleDataProviderEnabled = jest.fn();

        // for this test, all columns have text filters
        const allColumnsHaveTextFilters = defaultHeaders.map(header => ({
          ...header,
          columnHeaderType: 'text-filter' as ColumnHeaderType,
        }));

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <Timeline
                addNoteToEvent={jest.fn()}
                id="foo"
                columnHeaders={allColumnsHaveTextFilters}
                columnRenderers={columnRenderers}
                dataProviders={dataProviders}
                eventIdToNoteIds={{}}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                getNotesByIds={mockGetNotesByIds}
                indexPattern={indexPattern}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQuery=""
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onColumnRemoved={jest.fn()}
                onColumnResized={jest.fn()}
                onColumnSorted={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onFilterChange={jest.fn()}
                onPinEvent={jest.fn()}
                onRangeSelected={jest.fn()}
                onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
                onToggleDataProviderExcluded={jest.fn()}
                onUnPinEvent={jest.fn()}
                pinnedEventIds={{}}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                show={true}
                sort={sort}
                updateNote={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="andProviderButton"] span.euiBadge')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find('[data-test-subj="andProviderAccordion"] button.euiContextMenuItem')
          .at(1)
          .simulate('click');

        expect(mockOnToggleDataProviderEnabled.mock.calls[0][0]).toEqual({
          andProviderId: 'id-Provider 2',
          enabled: false,
          providerId: 'id-Provider 1',
        });
      });

      test('it invokes the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the accordeon menu', () => {
        const dataProviders = mockDataProviders.slice(0, 1);
        dataProviders[0].and = mockDataProviders.slice(1, 3);
        const mockOnToggleDataProviderExcluded = jest.fn();

        // for this test, all columns have text filters
        const allColumnsHaveTextFilters = defaultHeaders.map(header => ({
          ...header,
          columnHeaderType: 'text-filter' as ColumnHeaderType,
        }));

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <Timeline
                addNoteToEvent={jest.fn()}
                id="foo"
                columnHeaders={allColumnsHaveTextFilters}
                columnRenderers={columnRenderers}
                dataProviders={dataProviders}
                eventIdToNoteIds={{}}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                getNotesByIds={mockGetNotesByIds}
                indexPattern={indexPattern}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQuery=""
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onColumnRemoved={jest.fn()}
                onColumnResized={jest.fn()}
                onColumnSorted={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onFilterChange={jest.fn()}
                onPinEvent={jest.fn()}
                onRangeSelected={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={mockOnToggleDataProviderExcluded}
                onUnPinEvent={jest.fn()}
                pinnedEventIds={{}}
                range={'1 Day'}
                rowRenderers={rowRenderers}
                show={true}
                sort={sort}
                updateNote={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="andProviderButton"] span.euiBadge')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find('[data-test-subj="andProviderAccordion"] button.euiContextMenuItem')
          .first()
          .simulate('click');

        expect(mockOnToggleDataProviderExcluded.mock.calls[0][0]).toEqual({
          andProviderId: 'id-Provider 2',
          excluded: true,
          providerId: 'id-Provider 1',
        });
      });
    });
  });
});
