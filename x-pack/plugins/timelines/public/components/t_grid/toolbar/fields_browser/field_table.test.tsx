/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { mockBrowserFields, TestProviders } from '../../../../mock';
import { tGridActions } from '../../../../store/t_grid';
import { defaultColumnHeaderType } from '../../body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH, DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../../body/constants';

import { ColumnHeaderOptions } from '../../../../../common';
import { FieldTable, FieldTableProps } from './field_table';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const timestampFieldId = '@timestamp';

const columnHeaders: ColumnHeaderOptions[] = [
  {
    category: 'base',
    columnHeaderType: defaultColumnHeaderType,
    description:
      'Date/time when the event originated.\nFor log events this is the date/time when the event was generated, and not when it was read.\nRequired field for all events.',
    example: '2016-05-23T08:05:34.853Z',
    id: timestampFieldId,
    type: 'date',
    aggregatable: true,
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
  },
];
const timelineId = 'test';
const defaultProps: FieldTableProps = {
  selectedCategoryIds: [],
  columnHeaders: [],
  filteredBrowserFields: {},
  searchInput: '',
  timelineId,
  filterSelectedEnabled: false,
  onFilterSelectedChange: jest.fn(),
  onHide: jest.fn(),
};

describe('FieldTable', () => {
  const timestampField = mockBrowserFields.base.fields![timestampFieldId];
  const defaultPageSize = 10;

  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('should render empty field table', () => {
    const result = render(
      <TestProviders>
        <FieldTable {...defaultProps} />
      </TestProviders>
    );

    expect(result.getByText('No items found')).toBeInTheDocument();
  });

  it('should render field table with fields of all categories', () => {
    const result = render(
      <TestProviders>
        <FieldTable {...defaultProps} filteredBrowserFields={mockBrowserFields} />
      </TestProviders>
    );

    expect(result.container.getElementsByClassName('euiTableRow').length).toBe(defaultPageSize);
  });

  it('should render field table with fields of categories selected', () => {
    const selectedCategoryIds = ['client', 'event'];

    const fieldCount = selectedCategoryIds.reduce(
      (total, selectedCategoryId) =>
        total + Object.keys(mockBrowserFields[selectedCategoryId].fields ?? {}).length,
      0
    );

    const result = render(
      <TestProviders>
        <FieldTable
          {...defaultProps}
          selectedCategoryIds={selectedCategoryIds}
          filteredBrowserFields={mockBrowserFields}
        />
      </TestProviders>
    );

    expect(result.container.getElementsByClassName('euiTableRow').length).toBe(fieldCount);
  });

  it('should render field table with custom columns', () => {
    const fieldTableColumns = [
      {
        field: 'name',
        name: 'Custom column',
        render: () => <div data-test-subj="customColumn" />,
      },
    ];

    const result = render(
      <TestProviders>
        <FieldTable
          {...defaultProps}
          getFieldTableColumns={() => fieldTableColumns}
          filteredBrowserFields={mockBrowserFields}
        />
      </TestProviders>
    );

    expect(result.getAllByText('Custom column').length).toBeGreaterThan(0);
    expect(result.getAllByTestId('customColumn').length).toEqual(defaultPageSize);
  });

  it('should render field table with unchecked field', () => {
    const result = render(
      <TestProviders>
        <FieldTable
          {...defaultProps}
          selectedCategoryIds={['base']}
          filteredBrowserFields={{ base: { fields: { [timestampFieldId]: timestampField } } }}
        />
      </TestProviders>
    );

    const checkbox = result.getByTestId(`field-${timestampFieldId}-checkbox`);
    expect(checkbox).not.toHaveAttribute('checked');
  });

  it('should render field table with checked field', () => {
    const result = render(
      <TestProviders>
        <FieldTable
          {...defaultProps}
          selectedCategoryIds={['base']}
          columnHeaders={columnHeaders}
          filteredBrowserFields={{ base: { fields: { [timestampFieldId]: timestampField } } }}
        />
      </TestProviders>
    );

    const checkbox = result.getByTestId(`field-${timestampFieldId}-checkbox`);
    expect(checkbox).toHaveAttribute('checked');
  });

  describe('selection', () => {
    it('should dispatch remove column action on field unchecked', () => {
      const result = render(
        <TestProviders>
          <FieldTable
            {...defaultProps}
            selectedCategoryIds={['base']}
            columnHeaders={columnHeaders}
            filteredBrowserFields={{ base: { fields: { [timestampFieldId]: timestampField } } }}
          />
        </TestProviders>
      );

      result.getByTestId(`field-${timestampFieldId}-checkbox`).click();

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        tGridActions.removeColumn({ id: timelineId, columnId: timestampFieldId })
      );
    });

    it('should dispatch upsert column action on field checked', () => {
      const result = render(
        <TestProviders>
          <FieldTable
            {...defaultProps}
            selectedCategoryIds={['base']}
            filteredBrowserFields={{ base: { fields: { [timestampFieldId]: timestampField } } }}
          />
        </TestProviders>
      );

      result.getByTestId(`field-${timestampFieldId}-checkbox`).click();

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        tGridActions.upsertColumn({
          id: timelineId,
          column: {
            columnHeaderType: defaultColumnHeaderType,
            id: timestampFieldId,
            initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
          },
          index: 1,
        })
      );
    });
  });

  describe('pagination', () => {
    const isAtFirstPage = (result: RenderResult) =>
      result.getByTestId('pagination-button-0').classList.contains('euiPaginationButton-isActive');

    const changePage = (result: RenderResult) => {
      result.getByTestId('pagination-button-1').click();
    };

    const defaultPaginationProps: FieldTableProps = {
      ...defaultProps,
      filteredBrowserFields: mockBrowserFields,
    };

    it('should paginate on page clicked', () => {
      const result = render(
        <TestProviders>
          <FieldTable {...defaultPaginationProps} />
        </TestProviders>
      );

      expect(isAtFirstPage(result)).toBeTruthy();

      changePage(result);

      expect(isAtFirstPage(result)).toBeFalsy();
    });

    it('should not reset on field checked', () => {
      const result = render(
        <TestProviders>
          <FieldTable {...defaultPaginationProps} />
        </TestProviders>
      );

      changePage(result);

      result.getAllByRole('checkbox').at(0)?.click();
      expect(mockDispatch).toHaveBeenCalled(); // assert some field has been selected

      expect(isAtFirstPage(result)).toBeFalsy();
    });

    it('should reset on filter change', () => {
      const result = render(
        <FieldTable
          {...defaultPaginationProps}
          selectedCategoryIds={['destination', 'event', 'client', 'agent', 'host']}
        />,
        { wrapper: TestProviders }
      );

      changePage(result);
      expect(isAtFirstPage(result)).toBeFalsy();

      result.rerender(
        <FieldTable
          {...defaultPaginationProps}
          selectedCategoryIds={['destination', 'event', 'client', 'agent']}
        />
      );

      expect(isAtFirstPage(result)).toBeTruthy();
    });
  });
});
