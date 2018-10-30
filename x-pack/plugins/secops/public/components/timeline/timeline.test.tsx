/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as fp from 'lodash/fp';
import * as React from 'react';
import { ColumnHeaderType } from './body/column_headers/column_header';
import { headers } from './body/column_headers/headers';
import { Sort } from './body/sort/sort';
import { mockDataProviders } from './data_providers/mock/mock_data_providers';
import { Timeline } from './timeline';

describe('Timeline', () => {
  const sort: Sort = {
    columnId: 'time',
    sortDirection: 'descending',
  };

  describe('rendering', () => {
    test('it renders the timeline header', () => {
      const wrapper = mount(
        <Timeline
          columnHeaders={headers}
          dataProviders={mockDataProviders}
          onColumnSorted={fp.noop}
          onDataProviderRemoved={fp.noop}
          onFilterChange={fp.noop}
          onRangeSelected={fp.noop}
          sort={sort}
          width={1000}
        />
      );

      expect(wrapper.find('[data-test-subj="timelineHeader"]').length).toEqual(1);
    });

    test('it renders the timeline body', () => {
      const wrapper = mount(
        <Timeline
          columnHeaders={headers}
          dataProviders={mockDataProviders}
          onColumnSorted={fp.noop}
          onDataProviderRemoved={fp.noop}
          onFilterChange={fp.noop}
          onRangeSelected={fp.noop}
          sort={sort}
          width={1000}
        />
      );

      expect(wrapper.find('[data-test-subj="body"]').length).toEqual(1);
    });
  });

  describe('event wire up', () => {
    describe('onColumnSorted', () => {
      test('it invokes the onColumnSorted callback when a header is clicked', () => {
        const mockOnColumnSorted = jest.fn();

        const wrapper = mount(
          <Timeline
            columnHeaders={headers}
            dataProviders={mockDataProviders}
            onColumnSorted={mockOnColumnSorted}
            onDataProviderRemoved={fp.noop}
            onFilterChange={fp.noop}
            onRangeSelected={fp.noop}
            sort={sort}
            width={1000}
          />
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
          <Timeline
            columnHeaders={headers}
            dataProviders={mockDataProviders}
            onColumnSorted={fp.noop}
            onDataProviderRemoved={mockOnDataProviderRemoved}
            onFilterChange={fp.noop}
            onRangeSelected={fp.noop}
            sort={sort}
            width={1000}
          />
        );

        wrapper
          .find('[data-test-subj="closeButton"]')
          .first()
          .simulate('click');

        const callbackParams = fp.omit('render', mockOnDataProviderRemoved.mock.calls[0][0]);

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
          <Timeline
            columnHeaders={allColumnsHaveTextFilters}
            dataProviders={mockDataProviders}
            onColumnSorted={fp.noop}
            onDataProviderRemoved={fp.noop}
            onFilterChange={mockOnFilterChange}
            onRangeSelected={fp.noop}
            sort={sort}
            width={1000}
          />
        );

        wrapper
          .find('[data-test-subj="textFilter"]')
          .first()
          .simulate('change', { target: { value: newFilter } });

        expect(mockOnFilterChange).toBeCalledWith({
          columnId: headers[0].id,
          filter: newFilter,
        });
      });
    });

    describe('onRangeSelected', () => {
      test('it invokes the onRangeSelected callback when a new range is selected', () => {
        const newSelection = '1 Day';
        const mockOnRangeSelected = jest.fn();

        const wrapper = mount(
          <Timeline
            columnHeaders={headers}
            dataProviders={mockDataProviders}
            onColumnSorted={fp.noop}
            onDataProviderRemoved={fp.noop}
            onFilterChange={fp.noop}
            onRangeSelected={mockOnRangeSelected}
            sort={sort}
            width={1000}
          />
        );

        wrapper
          .find('[data-test-subj="rangePicker"]')
          .simulate('change', { target: { value: newSelection } });

        expect(mockOnRangeSelected).toBeCalledWith(newSelection);
      });
    });
  });
});
