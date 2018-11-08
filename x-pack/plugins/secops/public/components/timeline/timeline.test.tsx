/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { noop, omit } from 'lodash/fp';
import * as React from 'react';

import { Timeline } from '.';
import { mockECSData } from '../../pages/mock/mock_ecs';
import { ColumnHeaderType } from './body/column_headers/column_header';
import { headers } from './body/column_headers/headers';
import { columnRenderers, rowRenderers } from './body/renderers';
import { Sort } from './body/sort';
import { mockDataProviders } from './data_providers/mock/mock_data_providers';

describe('Timeline', () => {
  const sort: Sort = {
    columnId: 'timestamp',
    sortDirection: 'descending',
  };

  describe('rendering', () => {
    test('it renders the timeline header', () => {
      const wrapper = mount(
        <Timeline
          columnHeaders={headers}
          columnRenderers={columnRenderers}
          data={mockECSData}
          dataProviders={mockDataProviders}
          onColumnSorted={noop}
          onDataProviderRemoved={noop}
          onFilterChange={noop}
          onRangeSelected={noop}
          rowRenderers={rowRenderers}
          sort={sort}
          width={1000}
        />
      );

      expect(wrapper.find('[data-test-subj="timelineHeader"]').exists()).toEqual(true);
    });

    test('it renders the timeline body', () => {
      const wrapper = mount(
        <Timeline
          columnHeaders={headers}
          columnRenderers={columnRenderers}
          data={mockECSData}
          dataProviders={mockDataProviders}
          onColumnSorted={noop}
          onDataProviderRemoved={noop}
          onFilterChange={noop}
          onRangeSelected={noop}
          rowRenderers={rowRenderers}
          sort={sort}
          width={1000}
        />
      );

      expect(wrapper.find('[data-test-subj="body"]').exists()).toEqual(true);
    });
  });

  describe('event wire up', () => {
    describe('onColumnSorted', () => {
      test('it invokes the onColumnSorted callback when a header is clicked', () => {
        const mockOnColumnSorted = jest.fn();

        const wrapper = mount(
          <Timeline
            columnHeaders={headers}
            columnRenderers={columnRenderers}
            data={mockECSData}
            dataProviders={mockDataProviders}
            onColumnSorted={mockOnColumnSorted}
            onDataProviderRemoved={noop}
            onFilterChange={noop}
            onRangeSelected={noop}
            rowRenderers={rowRenderers}
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
            columnRenderers={columnRenderers}
            data={mockECSData}
            dataProviders={mockDataProviders}
            onColumnSorted={noop}
            onDataProviderRemoved={mockOnDataProviderRemoved}
            onFilterChange={noop}
            onRangeSelected={noop}
            rowRenderers={rowRenderers}
            sort={sort}
            width={1000}
          />
        );

        wrapper
          .find('[data-test-subj="closeButton"]')
          .first()
          .simulate('click');

        const callbackParams = omit('render', mockOnDataProviderRemoved.mock.calls[0][0]);

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
            columnRenderers={columnRenderers}
            data={mockECSData}
            dataProviders={mockDataProviders}
            onColumnSorted={noop}
            onDataProviderRemoved={noop}
            onFilterChange={mockOnFilterChange}
            onRangeSelected={noop}
            rowRenderers={rowRenderers}
            sort={sort}
            width={1000}
          />
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

    describe('onRangeSelected', () => {
      test('it invokes the onRangeSelected callback when a new range is selected', () => {
        const newSelection = '1 Day';
        const mockOnRangeSelected = jest.fn();

        const wrapper = mount(
          <Timeline
            columnHeaders={headers}
            columnRenderers={columnRenderers}
            data={mockECSData}
            dataProviders={mockDataProviders}
            onColumnSorted={noop}
            onDataProviderRemoved={noop}
            onFilterChange={noop}
            onRangeSelected={mockOnRangeSelected}
            rowRenderers={rowRenderers}
            sort={sort}
            width={1000}
          />
        );

        wrapper
          .find('[data-test-subj="rangePicker"] select')
          .simulate('change', { target: { value: newSelection } });

        expect(mockOnRangeSelected).toBeCalledWith(newSelection);
      });
    });
  });
});
