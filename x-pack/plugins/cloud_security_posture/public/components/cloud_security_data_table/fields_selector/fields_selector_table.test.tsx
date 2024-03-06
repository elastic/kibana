/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { TestProvider } from '../../../test/test_provider';
import { FieldsSelectorTable, FieldsSelectorTableProps } from './fields_selector_table';

const mockDataView = {
  fields: {
    getAll: () => [
      { id: 'field1', name: 'field1', customLabel: 'Label 1', visualizable: true },
      { id: 'field2', name: 'field2', customLabel: 'Label 2', visualizable: true },
    ],
  },
} as any;

const mockOnFilterSelectedChange = jest.fn();

const renderFieldsTable = (props: Partial<FieldsSelectorTableProps> = {}) => {
  const defaultProps: FieldsSelectorTableProps = {
    dataView: mockDataView,
    columns: [],
    onAddColumn: jest.fn(),
    onRemoveColumn: jest.fn(),
    title: 'title',
    onFilterSelectedChange: mockOnFilterSelectedChange,
    isFilterSelectedEnabled: false,
  };

  return render(
    <TestProvider>
      <FieldsSelectorTable {...defaultProps} {...props} />
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

  describe('View selected', () => {
    beforeEach(() => {
      mockOnFilterSelectedChange.mockClear();
    });

    it('should render "view all" option when filterSelected is not enabled', () => {
      const { getByTestId } = renderFieldsTable({ isFilterSelectedEnabled: false });

      expect(getByTestId('viewSelectorButton').textContent).toBe('View: all');
    });

    it('should render "view selected" option when filterSelected is not enabled', () => {
      const { getByTestId } = renderFieldsTable({ isFilterSelectedEnabled: true });

      expect(getByTestId('viewSelectorButton').textContent).toBe('View: selected');
    });

    it('should open the view selector with button click', async () => {
      const { queryByTestId, getByTestId } = renderFieldsTable();

      expect(queryByTestId('viewSelectorMenu')).not.toBeInTheDocument();
      expect(queryByTestId('viewSelectorOption-all')).not.toBeInTheDocument();
      expect(queryByTestId('viewSelectorOption-selected')).not.toBeInTheDocument();

      getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();

      expect(getByTestId('viewSelectorMenu')).toBeInTheDocument();
      expect(getByTestId('viewSelectorOption-all')).toBeInTheDocument();
      expect(getByTestId('viewSelectorOption-selected')).toBeInTheDocument();
    });

    it('should callback when "view all" option is clicked', async () => {
      const { getByTestId } = renderFieldsTable({ isFilterSelectedEnabled: false });

      getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();
      getByTestId('viewSelectorOption-all').click();
      expect(mockOnFilterSelectedChange).toHaveBeenCalledWith(false);
    });

    it('should callback when "view selected" option is clicked', async () => {
      const { getByTestId } = renderFieldsTable({ isFilterSelectedEnabled: false });

      getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();
      getByTestId('viewSelectorOption-selected').click();
      expect(mockOnFilterSelectedChange).toHaveBeenCalledWith(true);
    });
  });
});
