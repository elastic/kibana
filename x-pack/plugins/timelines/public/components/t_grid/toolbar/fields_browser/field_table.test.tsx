/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
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
  onHide: jest.fn(),
};

describe('FieldTable', () => {
  const timestampField = mockBrowserFields.base.fields![timestampFieldId];
  const defaultPageSize = 10;
  const totalFields = Object.values(mockBrowserFields).reduce(
    (total, { fields }) => total + Object.keys(fields ?? {}).length,
    0
  );

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
    expect(result.getByTestId('fields-count').textContent).toContain('0');
  });

  it('should render field table with fields of all categories', () => {
    const result = render(
      <TestProviders>
        <FieldTable {...defaultProps} filteredBrowserFields={mockBrowserFields} />
      </TestProviders>
    );

    expect(result.container.getElementsByClassName('euiTableRow').length).toBe(defaultPageSize);
    expect(result.getByTestId('fields-count').textContent).toContain(totalFields);
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
    expect(result.getByTestId('fields-count').textContent).toContain(fieldCount);
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

    expect(result.getByTestId('fields-count').textContent).toContain(totalFields);
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
