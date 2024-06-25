/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { TestProvider } from '../../../test/test_provider';
import {
  FieldsSelectorTable,
  FieldsSelectorTableProps,
  filterFieldsBySearch,
} from './fields_selector_table';

const VIEW_MENU_ALL_TEXT = 'View: all';
const VIEW_MENU_SELECTED_TEXT = 'View: selected';

const mockDataView = {
  fields: {
    getAll: () => [
      { id: 'field1', name: 'field1', visualizable: true },
      { id: 'field2', name: 'field2', visualizable: true },
      { id: 'field3', name: 'field3', visualizable: true },
      { id: 'field4', name: 'field4', visualizable: true },
      { id: 'not-visible', name: 'not-visible', visualizable: false },
      { id: '_index', name: '_index', visualizable: true },
    ],
  },
} as any;

jest.mock('react-use/lib/useSessionStorage', () => jest.fn().mockReturnValue([false, jest.fn()]));

const renderFieldsTable = (props: Partial<FieldsSelectorTableProps> = {}) => {
  const defaultProps: FieldsSelectorTableProps = {
    dataView: mockDataView,
    columns: props.columns || [],
    onAddColumn: jest.fn(),
    onRemoveColumn: jest.fn(),
    title: 'title',
  };

  return render(
    <TestProvider>
      <FieldsSelectorTable {...defaultProps} {...props} />
    </TestProvider>
  );
};

describe('FieldsSelectorTable', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the table with data correctly', () => {
    const { getByText } = renderFieldsTable();

    expect(getByText('field1')).toBeInTheDocument();
    expect(getByText('field2')).toBeInTheDocument();
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
    it('should show "view all" option by default', () => {
      const { getByTestId } = renderFieldsTable();
      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_ALL_TEXT);
    });

    it('should render "view selected" option when previous selection was "view selected"', () => {
      (useSessionStorage as jest.Mock).mockReturnValueOnce([true, jest.fn()]);
      const { getByTestId } = renderFieldsTable();

      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_SELECTED_TEXT);
    });

    it('should show "view all" option after the "view all" is selected', async () => {
      // Forcing the view to be the selected state
      (useSessionStorage as jest.Mock).mockReturnValueOnce([true, jest.fn()]);

      const { getByTestId } = renderFieldsTable();
      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_SELECTED_TEXT);

      getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();

      getByTestId('viewSelectorOption-all').click();

      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_ALL_TEXT);
    });

    it('should show only selected columns after the "view selected" option is selected', async () => {
      (useSessionStorage as jest.Mock).mockReturnValueOnce([true, jest.fn()]);
      // Render the table with field3 selected
      const { getAllByRole, getByTestId } = renderFieldsTable({ columns: ['field3'] });
      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_SELECTED_TEXT);
      // Only field3 should be visible
      expect(getByTestId('cloud-security-fields-selector-item-field3')).toBeInTheDocument();
      expect(getAllByRole('checkbox').length).toBe(1);
    });

    it('should show all columns available after the "view all" option is selected', async () => {
      // Forcing the view to be the selected state
      (useSessionStorage as jest.Mock).mockReturnValueOnce([true, jest.fn()]);

      // Render the table with field3 selected
      const { getAllByRole, getByTestId } = renderFieldsTable({ columns: ['field3'] });
      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_SELECTED_TEXT);

      getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();

      getByTestId('viewSelectorOption-all').click();

      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_ALL_TEXT);
      // Only field3 should be visible
      expect(getByTestId('cloud-security-fields-selector-item-field3')).toBeInTheDocument();
      expect(getAllByRole('checkbox').length).toBe(4);
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
  });

  describe('Searching columns', () => {
    it('should find all columns match the search term', async () => {
      // No columns are selected and no search term
      expect(
        filterFieldsBySearch(mockDataView.fields.getAll(), undefined, undefined, false).length
      ).toEqual(4);

      // Columns selected and no search term
      expect(
        filterFieldsBySearch(mockDataView.fields.getAll(), ['field3', 'field4'], undefined, false)
          .length
      ).toEqual(4);

      expect(
        filterFieldsBySearch(mockDataView.fields.getAll(), ['field3', 'field4'], 'field', false)
          .length
      ).toEqual(4);

      expect(
        filterFieldsBySearch(mockDataView.fields.getAll(), ['field3', 'field4'], 'field3', false)
          .length
      ).toEqual(1);

      expect(
        filterFieldsBySearch(mockDataView.fields.getAll(), ['field3', 'field4'], 'foo', false)
          .length
      ).toEqual(0);
    });

    it('should find all columns match the search term and are selected', async () => {
      // No columns are selected and no search term
      expect(
        filterFieldsBySearch(mockDataView.fields.getAll(), undefined, undefined, true).length
      ).toEqual(0);

      // Columns selected and no search term
      expect(
        filterFieldsBySearch(mockDataView.fields.getAll(), ['field3', 'field4'], undefined, true)
          .length
      ).toEqual(2);

      expect(
        filterFieldsBySearch(mockDataView.fields.getAll(), ['field3', 'field4'], 'field', true)
          .length
      ).toEqual(2);

      expect(
        filterFieldsBySearch(mockDataView.fields.getAll(), ['field3', 'field4'], 'field3', true)
          .length
      ).toEqual(1);

      expect(
        filterFieldsBySearch(mockDataView.fields.getAll(), ['field3', 'field4'], 'foo', true).length
      ).toEqual(0);
    });
  });
});
