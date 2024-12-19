/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard } from '@elastic/eui';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { BadgeFilterWithPopover } from '.';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
}));

describe('BadgeFilterWithPopover', () => {
  const field = ENTITY_TYPE;
  const value = 'host';
  const popoverContentDataTestId = 'inventoryBadgeFilterWithPopoverContent';
  const popoverContentTitleTestId = 'inventoryBadgeFilterWithPopoverTitle';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the popover when the badge is clicked', () => {
    render(<BadgeFilterWithPopover field={field} value={value} onFilter={jest.fn()} />);
    expect(screen.queryByTestId(popoverContentDataTestId)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(value));
    expect(screen.queryByTestId(popoverContentDataTestId)).toBeInTheDocument();
    expect(screen.queryByTestId(popoverContentTitleTestId)?.textContent).toBe(`${field}:${value}`);
  });

  it('copies value to clipboard when the "Copy value" button is clicked', () => {
    render(<BadgeFilterWithPopover field={field} value={value} onFilter={jest.fn()} />);
    fireEvent.click(screen.getByText(value));
    fireEvent.click(screen.getByTestId('inventoryBadgeFilterWithPopoverCopyValueButton'));
    expect(copyToClipboard).toHaveBeenCalledWith(value);
  });

  it('Filter for an entity', () => {
    const handleFilter = jest.fn();
    render(<BadgeFilterWithPopover field={field} value={value} onFilter={handleFilter} />);
    fireEvent.click(screen.getByText(value));
    fireEvent.click(screen.getByTestId('inventoryBadgeFilterWithPopoverFilterForButton'));
    expect(handleFilter).toHaveBeenCalledWith(value, 'on');
  });

  it('Filter out an entity', () => {
    const handleFilter = jest.fn();
    render(<BadgeFilterWithPopover field={field} value={value} onFilter={handleFilter} />);
    fireEvent.click(screen.getByText(value));
    fireEvent.click(screen.getByTestId('inventoryBadgeFilterWithPopoverFilterOutButton'));
    expect(handleFilter).toHaveBeenCalledWith(value, 'off');
  });
});
