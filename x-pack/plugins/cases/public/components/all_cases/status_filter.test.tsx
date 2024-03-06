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
import * as i18n from './translations';

const LABELS = {
  closed: i18n.STATUS_CLOSED,
  open: i18n.STATUS_OPEN,
  inProgress: i18n.STATUS_IN_PROGRESS,
};

// FLAKY: https://github.com/elastic/kibana/issues/177334
describe.skip('StatusFilter', () => {
  const onChange = jest.fn();
  const defaultProps = {
    selectedOptionKeys: [],
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

    expect(screen.getByRole('option', { name: LABELS.open })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: LABELS.inProgress })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: LABELS.closed })).toBeInTheDocument();
    expect(screen.getAllByRole('option').length).toBe(3);
  });

  it('should call onStatusChanged when changing status to open', async () => {
    render(<StatusFilter {...defaultProps} />);

    userEvent.click(screen.getByRole('button', { name: 'Status' }));
    await waitForEuiPopoverOpen();
    userEvent.click(screen.getByRole('option', { name: LABELS.open }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        filterId: 'status',
        selectedOptionKeys: [CaseStatuses.open],
      });
    });
  });

  it('should not render hidden statuses', async () => {
    render(<StatusFilter {...defaultProps} hiddenStatuses={[CaseStatuses.closed]} />);

    userEvent.click(screen.getByRole('button', { name: 'Status' }));
    await waitForEuiPopoverOpen();

    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: LABELS.open })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: LABELS.inProgress })).toBeInTheDocument();
  });
});
