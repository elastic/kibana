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
import { SESSION_STORAGE_FIELDS_MODAL_SHOW_SELECTED } from '../../../common/constants';
import { FieldsSelectorTable, FieldsSelectorTableProps } from './fields_selector_table';

const VIEW_MENU_ALL_TEXT = 'View: all';
const VIEW_MENU_SELECTED_TEXT = 'View: selected';

const mockDataView = {
  fields: {
    getAll: () => [
      { id: 'field1', name: 'field1', customLabel: 'Label 1', visualizable: true },
      { id: 'field2', name: 'field2', customLabel: 'Label 2', visualizable: true },
      { id: 'field3', name: 'field3', customLabel: 'Label 3', visualizable: true },
    ],
  },
} as any;

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
    afterEach(() => {
      sessionStorage.removeItem(SESSION_STORAGE_FIELDS_MODAL_SHOW_SELECTED);
    });

    it('should render "view all" option by default', () => {
      // Just for the sake of readability, cleaning up the session storage
      sessionStorage.removeItem(SESSION_STORAGE_FIELDS_MODAL_SHOW_SELECTED);
      const { getByTestId } = renderFieldsTable();

      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_ALL_TEXT);
    });

    it('should render "view all" option after the local storage showSelected is false', () => {
      const { getByTestId } = renderFieldsTable();

      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_ALL_TEXT);
    });

    it('should render "view selected" option after the local storage showSelected is true', () => {
      sessionStorage.setItem(SESSION_STORAGE_FIELDS_MODAL_SHOW_SELECTED, 'true');
      const { getByTestId } = renderFieldsTable();

      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_SELECTED_TEXT);
    });

    it('should show the "view all" option after the "view all" option is selected', async () => {
      // Forcing the view to be the selected state
      sessionStorage.setItem(SESSION_STORAGE_FIELDS_MODAL_SHOW_SELECTED, 'true');
      const { getByTestId } = renderFieldsTable();
      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_SELECTED_TEXT);

      getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();

      getByTestId('viewSelectorOption-all').click();

      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_ALL_TEXT);
    });

    it('should show the only selected columns after the "view selected" option is selected', async () => {
      // Render the table with field3 selected
      const { getAllByRole, getByTestId } = renderFieldsTable({ columns: ['field3'] });
      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_ALL_TEXT);

      getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();

      getByTestId('viewSelectorOption-selected').click();

      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_SELECTED_TEXT);
      // Only field3 should be visible
      expect(getByTestId('cloud-security-fields-selector-item-field3')).toBeInTheDocument();
      expect(getAllByRole('checkbox').length).toBe(1);
    });

    it('should show all columns available after the "view all" option is selected', async () => {
      // Forcing the view to be the selected state
      sessionStorage.setItem(SESSION_STORAGE_FIELDS_MODAL_SHOW_SELECTED, 'true');

      // Render the table with field3 selected
      const { getAllByRole, getByTestId } = renderFieldsTable({ columns: ['field3'] });
      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_SELECTED_TEXT);

      getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();

      getByTestId('viewSelectorOption-all').click();

      expect(getByTestId('viewSelectorButton').textContent).toBe(VIEW_MENU_ALL_TEXT);
      // Only field3 should be visible
      expect(getByTestId('cloud-security-fields-selector-item-field3')).toBeInTheDocument();
      expect(getAllByRole('checkbox').length).toBe(3);
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
});
