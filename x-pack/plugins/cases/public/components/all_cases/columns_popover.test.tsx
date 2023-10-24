/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '../../common/mock';
import { ColumnsPopover } from './columns_popover';

describe('ColumnsPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const selectedColumns = [
    { field: 'title', name: 'Title', isChecked: true },
    { field: 'category', name: 'Category', isChecked: false },
  ];

  it('renders correctly a list of selected columns', () => {
    render(
      <TestProviders>
        <ColumnsPopover selectedColumns={selectedColumns} onSelectedColumnsChange={() => {}} />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('column-selection-popover'));

    selectedColumns.forEach(({ field, name, isChecked }) => {
      expect(screen.getByTestId(`column-selection-switch-${field}`)).toHaveAttribute(
        'aria-checked',
        isChecked.toString()
      );
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('clicking a switch calls onSelectedColumnsChange with the right params', async () => {
    const onSelectedColumnsChange = jest.fn();

    render(
      <TestProviders>
        <ColumnsPopover
          selectedColumns={selectedColumns}
          onSelectedColumnsChange={onSelectedColumnsChange}
        />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('column-selection-popover'));
    userEvent.click(
      screen.getByTestId(`column-selection-switch-${selectedColumns[0].field}`),
      undefined,
      { skipPointerEventsCheck: true }
    );

    await waitFor(() => {
      expect(onSelectedColumnsChange).toHaveBeenCalledWith([
        { ...selectedColumns[0], isChecked: false },
        selectedColumns[1],
      ]);
    });
  });

  it.skip('drag and rop calls onSelectedColumnsChange with the right params', async () => {});
});
