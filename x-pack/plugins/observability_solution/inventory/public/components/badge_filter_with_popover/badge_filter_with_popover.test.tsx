/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { BadgeFilterWithPopover } from '.';
import { EuiThemeProvider, copyToClipboard } from '@elastic/eui';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
}));

describe('BadgeFilterWithPopover', () => {
  const mockOnFilter = jest.fn();
  const field = ENTITY_TYPE;
  const value = 'host';
  const label = 'Host';
  const popoverContentDataTestId = 'inventoryBadgeFilterWithPopoverContent';
  const popoverContentTitleTestId = 'inventoryBadgeFilterWithPopoverTitle';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the badge with the correct label', () => {
    render(
      <BadgeFilterWithPopover field={field} value={value} onFilter={mockOnFilter} label={label} />,
      { wrapper: EuiThemeProvider }
    );
    expect(screen.queryByText(label)).toBeInTheDocument();
    expect(screen.getByText(label).textContent).toBe(label);
  });

  it('opens the popover when the badge is clicked', () => {
    render(<BadgeFilterWithPopover field={field} value={value} onFilter={mockOnFilter} />);
    expect(screen.queryByTestId(popoverContentDataTestId)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(value));
    expect(screen.queryByTestId(popoverContentDataTestId)).toBeInTheDocument();
    expect(screen.queryByTestId(popoverContentTitleTestId)?.textContent).toBe(`${field}:${value}`);
  });

  it('calls onFilter when the "Filter for" button is clicked', () => {
    render(<BadgeFilterWithPopover field={field} value={value} onFilter={mockOnFilter} />);
    fireEvent.click(screen.getByText(value));
    fireEvent.click(screen.getByTestId('inventoryBadgeFilterWithPopoverFilterForButton'));
    expect(mockOnFilter).toHaveBeenCalled();
  });

  it('copies value to clipboard when the "Copy value" button is clicked', () => {
    render(<BadgeFilterWithPopover field={field} value={value} onFilter={mockOnFilter} />);
    fireEvent.click(screen.getByText(value));
    fireEvent.click(screen.getByTestId('inventoryBadgeFilterWithPopoverCopyValueButton'));
    expect(copyToClipboard).toHaveBeenCalledWith(value);
  });
});
