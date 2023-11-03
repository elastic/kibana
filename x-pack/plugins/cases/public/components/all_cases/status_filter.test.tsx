/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaseStatuses } from '../../../common/types/domain';
import { StatusFilter } from './status_filter';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

describe('StatusFilter', () => {
  const onChange = jest.fn();
  const defaultProps = {
    selectedOptions: [],
    countClosedCases: 7,
    countInProgressCases: 5,
    countOpenCases: 2,
    onChange,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render', async () => {
    render(<StatusFilter {...defaultProps} />);

    expect(screen.getByTestId('options-filter-popover-button-status')).toBeInTheDocument();
    expect(screen.getByTestId('options-filter-popover-button-status')).not.toBeDisabled();

    userEvent.click(screen.getByRole('button', { name: 'Status' }));
    await waitForEuiPopoverOpen();

    expect(screen.getByRole('option', { name: 'open' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'in-progress' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'closed' })).toBeInTheDocument();
    expect(screen.getAllByRole('option').length).toBe(3);
  });

  it('should call onStatusChanged when changing status to open', async () => {
    render(<StatusFilter {...defaultProps} />);

    userEvent.click(screen.getByRole('button', { name: 'Status' }));
    await waitForEuiPopoverOpen();
    userEvent.click(screen.getByRole('option', { name: 'open' }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ filterId: 'status', options: ['open'] });
    });
  });

  it('should not render hidden statuses', async () => {
    render(<StatusFilter {...defaultProps} hiddenStatuses={[CaseStatuses.closed]} />);

    userEvent.click(screen.getByRole('button', { name: 'Status' }));
    await waitForEuiPopoverOpen();

    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'open' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'in-progress' })).toBeInTheDocument();
  });
});
