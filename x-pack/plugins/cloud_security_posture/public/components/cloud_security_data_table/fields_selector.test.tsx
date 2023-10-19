/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { FieldsSelectorTable, FieldsSelectorCommonProps } from './fields_selector';
import { TestProvider } from '../../test/test_provider';

const mockDataView = {
  fields: {
    getAll: () => [
      { id: 'field1', name: 'field1', customLabel: 'Label 1', visualizable: true },
      { id: 'field2', name: 'field2', customLabel: 'Label 2', visualizable: true },
    ],
  },
} as any;

const renderFieldsTable = (props: Partial<FieldsSelectorCommonProps> = {}) => {
  const defaultProps: FieldsSelectorCommonProps = {
    dataView: mockDataView,
    columns: [],
    onAddColumn: jest.fn(),
    onRemoveColumn: jest.fn(),
  };

  return render(
    <TestProvider>
      <FieldsSelectorTable title="Fields" {...defaultProps} {...props} />
    </TestProvider>
  );
};

describe('FieldsSelectorTable', () => {
  it('renders the table with data correctly', () => {
    const { getByText } = renderFieldsTable();

    expect(getByText('Label 1')).toBeInTheDocument();
    expect(getByText('Label 2')).toBeInTheDocument();
  });

  it('calls onAddColumn when a checkbox is checked', () => {
    const onAddColumn = jest.fn();
    const { getAllByRole } = renderFieldsTable({
      onAddColumn,
    });

    const checkbox = getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);

    expect(onAddColumn).toHaveBeenCalledWith('field1');
  });

  it('calls onRemoveColumn when a checkbox is unchecked', () => {
    const onRemoveColumn = jest.fn();
    const { getAllByRole } = renderFieldsTable({
      columns: ['field1', 'field2'],
      onRemoveColumn,
    });

    const checkbox = getAllByRole('checkbox')[1];
    fireEvent.click(checkbox);

    expect(onRemoveColumn).toHaveBeenCalledWith('field2');
  });
});
