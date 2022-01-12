/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../lib/helper/rtl_helpers';
import * as fetchers from '../../../state/api/monitor_management';
import {
  FETCH_STATUS,
  useFetcher as originalUseFetcher,
} from '../../../../../observability/public';
import { spyOnUseFetcher } from '../../../lib/helper/spy_use_fetcher';
import { Actions } from './actions';

describe('<Actions />', () => {
  const setRefresh = jest.fn();
  const useFetcher = spyOnUseFetcher({});

  it('navigates to edit monitor flow on edit pencil', () => {
    render(<Actions id="test-id" setRefresh={setRefresh} />);

    expect(screen.getByLabelText('Edit monitor')).toHaveAttribute(
      'href',
      '/app/uptime/edit-monitor/dGVzdC1pZA=='
    );
  });

  it('calls delete monitor on monitor deletion', () => {
    useFetcher.mockImplementation(originalUseFetcher);
    const deleteMonitor = jest.spyOn(fetchers, 'deleteMonitor');
    const id = 'test-id';
    render(<Actions id={id} setRefresh={setRefresh} />);

    expect(deleteMonitor).not.toBeCalled();

    userEvent.click(screen.getByRole('button'));

    expect(deleteMonitor).toBeCalledWith({ id });
  });

  it('calls set refresh when deletion is successful', () => {
    const id = 'test-id';
    render(<Actions id={id} setRefresh={setRefresh} />);

    userEvent.click(screen.getByLabelText('Delete monitor'));

    expect(setRefresh).toBeCalledWith(true);
  });

  it('shows loading spinner while waiting for monitor to delete', () => {
    const id = 'test-id';
    useFetcher.mockReturnValue({
      data: {},
      status: FETCH_STATUS.LOADING,
      refetch: () => {},
    });
    render(<Actions id={id} setRefresh={setRefresh} />);

    expect(screen.getByLabelText('Deleting monitor...')).toBeInTheDocument();
  });
});
