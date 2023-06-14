/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { useEnableDataFeed } from '../../../../../common/components/ml_popover/hooks/use_enable_data_feed';
import type { SecurityJob } from '../../../../../common/components/ml_popover/types';
import { EnableJob } from './enable_job';

jest.mock('../../../../../common/components/ml_popover/hooks/use_enable_data_feed', () => ({
  useEnableDataFeed: jest.fn(() => ({ enableDatafeed: jest.fn(), isLoading: false })),
}));

describe('EnableJob', () => {
  const job = { id: 'job-1', latestTimestampMs: 123456789 } as SecurityJob;

  it('renders loading spinner when isLoading is true', () => {
    const { queryByTestId } = render(
      <EnableJob job={job} isLoading={true} onJobEnabled={jest.fn()} />
    );
    expect(queryByTestId('job-switch-loader')).toBeInTheDocument();
  });

  it('renders enable job when isLoading is false', () => {
    const { queryByTestId } = render(
      <EnableJob job={job} isLoading={false} onJobEnabled={jest.fn()} />
    );
    expect(queryByTestId('job-switch-loader')).not.toBeInTheDocument();
  });

  it('calls enableDatafeed and onJobEnabled when enable job is clicked', async () => {
    const enableDatafeedMock = jest.fn(() => ({ enabled: true }));
    const onJobEnabledMock = jest.fn();
    (useEnableDataFeed as jest.Mock).mockReturnValueOnce({
      enableDatafeed: enableDatafeedMock,
      isLoading: false,
    });
    const { getByText } = render(
      <EnableJob job={job} isLoading={false} onJobEnabled={onJobEnabledMock} />
    );
    fireEvent.click(getByText('Run job'));

    await waitFor(() => {
      expect(enableDatafeedMock).toHaveBeenCalledWith(job, job.latestTimestampMs);
      expect(onJobEnabledMock).toHaveBeenCalledWith(job);
    });
  });

  it('renders loading spinner when enabling data feed', async () => {
    const enableDatafeedMock = jest.fn(() => ({ enabled: true }));
    const onJobEnabledMock = jest.fn();
    (useEnableDataFeed as jest.Mock).mockReturnValueOnce({
      enableDatafeed: enableDatafeedMock,
      isLoading: true,
    });
    const { queryByTestId } = render(
      <EnableJob job={job} isLoading={false} onJobEnabled={onJobEnabledMock} />
    );

    expect(queryByTestId('job-switch-loader')).toBeInTheDocument();
  });
});
