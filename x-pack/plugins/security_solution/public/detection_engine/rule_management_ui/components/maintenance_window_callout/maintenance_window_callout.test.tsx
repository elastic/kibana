/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { MaintenanceWindowCallout } from './maintenance_window_callout';
import { TestProviders } from '../../../../common/mock';
import { fetchActiveMaintenanceWindows } from './api';

jest.mock('../../../../common/hooks/use_app_toasts');

jest.mock('./api', () => ({
  fetchActiveMaintenanceWindows: jest.fn(() => Promise.resolve([])),
}));

const RUNNING_MAINTENANCE_WINDOW_1 = {
  title: 'Maintenance window 1',
  enabled: true,
  duration: 1800000,
  events: [{ gte: '2023-04-20T16:27:30.753Z', lte: '2023-04-20T16:57:30.753Z' }],
  id: '63057284-ac31-42ba-fe22-adfe9732e5ae',
  status: 'running',
  expiration_date: '2024-04-20T16:27:41.301Z',
  r_rule: {
    dtstart: '2023-04-20T16:27:30.753Z',
    tzid: 'Europe/Amsterdam',
    freq: 0,
    count: 1,
  },
  created_by: 'elastic',
  updated_by: 'elastic',
  created_at: '2023-04-20T16:27:41.301Z',
  updated_at: '2023-04-20T16:27:41.301Z',
  event_start_time: '2023-04-20T16:27:30.753Z',
  event_end_time: '2023-04-20T16:57:30.753Z',
};

const RUNNING_MAINTENANCE_WINDOW_2 = {
  title: 'Maintenance window 2',
  enabled: true,
  duration: 1800000,
  events: [{ gte: '2023-04-20T16:47:42.871Z', lte: '2023-04-20T17:11:32.192Z' }],
  id: '45894340-df98-11ed-ac81-bfcb4982b4fd',
  status: 'running',
  expiration_date: '2023-04-20T16:47:42.871Z',
  r_rule: {
    dtstart: '2023-04-20T16:47:42.871Z',
    tzid: 'Europe/Amsterdam',
    freq: 0,
    count: 1,
  },
  created_by: 'elastic',
  updated_by: 'elastic',
  created_at: '2023-04-20T16:30:51.208Z',
  updated_at: '2023-04-20T16:30:51.208Z',
  event_start_time: '2023-04-20T16:47:42.871Z',
  event_end_time: '2023-04-20T17:11:32.192Z',
};

const UPCOMING_MAINTENANCE_WINDOW = {
  title: 'Upcoming maintenance window',
  enabled: true,
  duration: 45972,
  events: [
    { gte: '2023-04-21T10:36:14.028Z', lte: '2023-04-21T10:37:00.000Z' },
    { gte: '2023-04-28T10:36:14.028Z', lte: '2023-04-28T10:37:00.000Z' },
    { gte: '2023-05-05T10:36:14.028Z', lte: '2023-05-05T10:37:00.000Z' },
    { gte: '2023-05-12T10:36:14.028Z', lte: '2023-05-12T10:37:00.000Z' },
    { gte: '2023-05-19T10:36:14.028Z', lte: '2023-05-19T10:37:00.000Z' },
    { gte: '2023-05-26T10:36:14.028Z', lte: '2023-05-26T10:37:00.000Z' },
    { gte: '2023-06-02T10:36:14.028Z', lte: '2023-06-02T10:37:00.000Z' },
    { gte: '2023-06-09T10:36:14.028Z', lte: '2023-06-09T10:37:00.000Z' },
    { gte: '2023-06-16T10:36:14.028Z', lte: '2023-06-16T10:37:00.000Z' },
    { gte: '2023-06-23T10:36:14.028Z', lte: '2023-06-23T10:37:00.000Z' },
    { gte: '2023-06-30T10:36:14.028Z', lte: '2023-06-30T10:37:00.000Z' },
    { gte: '2023-07-07T10:36:14.028Z', lte: '2023-07-07T10:37:00.000Z' },
    { gte: '2023-07-14T10:36:14.028Z', lte: '2023-07-14T10:37:00.000Z' },
    { gte: '2023-07-21T10:36:14.028Z', lte: '2023-07-21T10:37:00.000Z' },
    { gte: '2023-07-28T10:36:14.028Z', lte: '2023-07-28T10:37:00.000Z' },
    { gte: '2023-08-04T10:36:14.028Z', lte: '2023-08-04T10:37:00.000Z' },
    { gte: '2023-08-11T10:36:14.028Z', lte: '2023-08-11T10:37:00.000Z' },
    { gte: '2023-08-18T10:36:14.028Z', lte: '2023-08-18T10:37:00.000Z' },
    { gte: '2023-08-25T10:36:14.028Z', lte: '2023-08-25T10:37:00.000Z' },
    { gte: '2023-09-01T10:36:14.028Z', lte: '2023-09-01T10:37:00.000Z' },
    { gte: '2023-09-08T10:36:14.028Z', lte: '2023-09-08T10:37:00.000Z' },
    { gte: '2023-09-15T10:36:14.028Z', lte: '2023-09-15T10:37:00.000Z' },
    { gte: '2023-09-22T10:36:14.028Z', lte: '2023-09-22T10:37:00.000Z' },
    { gte: '2023-09-29T10:36:14.028Z', lte: '2023-09-29T10:37:00.000Z' },
    { gte: '2023-10-06T10:36:14.028Z', lte: '2023-10-06T10:37:00.000Z' },
    { gte: '2023-10-13T10:36:14.028Z', lte: '2023-10-13T10:37:00.000Z' },
    { gte: '2023-10-20T10:36:14.028Z', lte: '2023-10-20T10:37:00.000Z' },
    { gte: '2023-10-27T10:36:14.028Z', lte: '2023-10-27T10:37:00.000Z' },
    { gte: '2023-11-03T11:36:14.028Z', lte: '2023-11-03T11:37:00.000Z' },
    { gte: '2023-11-10T11:36:14.028Z', lte: '2023-11-10T11:37:00.000Z' },
    { gte: '2023-11-17T11:36:14.028Z', lte: '2023-11-17T11:37:00.000Z' },
    { gte: '2023-11-24T11:36:14.028Z', lte: '2023-11-24T11:37:00.000Z' },
    { gte: '2023-12-01T11:36:14.028Z', lte: '2023-12-01T11:37:00.000Z' },
    { gte: '2023-12-08T11:36:14.028Z', lte: '2023-12-08T11:37:00.000Z' },
    { gte: '2023-12-15T11:36:14.028Z', lte: '2023-12-15T11:37:00.000Z' },
    { gte: '2023-12-22T11:36:14.028Z', lte: '2023-12-22T11:37:00.000Z' },
    { gte: '2023-12-29T11:36:14.028Z', lte: '2023-12-29T11:37:00.000Z' },
    { gte: '2024-01-05T11:36:14.028Z', lte: '2024-01-05T11:37:00.000Z' },
    { gte: '2024-01-12T11:36:14.028Z', lte: '2024-01-12T11:37:00.000Z' },
    { gte: '2024-01-19T11:36:14.028Z', lte: '2024-01-19T11:37:00.000Z' },
    { gte: '2024-01-26T11:36:14.028Z', lte: '2024-01-26T11:37:00.000Z' },
    { gte: '2024-02-02T11:36:14.028Z', lte: '2024-02-02T11:37:00.000Z' },
    { gte: '2024-02-09T11:36:14.028Z', lte: '2024-02-09T11:37:00.000Z' },
    { gte: '2024-02-16T11:36:14.028Z', lte: '2024-02-16T11:37:00.000Z' },
    { gte: '2024-02-23T11:36:14.028Z', lte: '2024-02-23T11:37:00.000Z' },
    { gte: '2024-03-01T11:36:14.028Z', lte: '2024-03-01T11:37:00.000Z' },
    { gte: '2024-03-08T11:36:14.028Z', lte: '2024-03-08T11:37:00.000Z' },
    { gte: '2024-03-15T11:36:14.028Z', lte: '2024-03-15T11:37:00.000Z' },
    { gte: '2024-03-22T11:36:14.028Z', lte: '2024-03-22T11:37:00.000Z' },
    { gte: '2024-03-29T11:36:14.028Z', lte: '2024-03-29T11:37:00.000Z' },
    { gte: '2024-04-05T10:36:14.028Z', lte: '2024-04-05T10:37:00.000Z' },
    { gte: '2024-04-12T10:36:14.028Z', lte: '2024-04-12T10:37:00.000Z' },
    { gte: '2024-04-19T10:36:14.028Z', lte: '2024-04-19T10:37:00.000Z' },
  ],
  id: '5eafe070-e030-11ed-ac81-bfcb4982b4fd',
  status: 'upcoming',
  expiration_date: '2024-04-21T10:36:26.999Z',
  r_rule: {
    dtstart: '2023-04-21T10:36:14.028Z',
    tzid: 'Europe/Amsterdam',
    freq: 3,
    interval: 1,
    byweekday: ['FR'],
  },
  created_by: 'elastic',
  updated_by: 'elastic',
  created_at: '2023-04-21T10:36:26.999Z',
  updated_at: '2023-04-21T10:36:26.999Z',
  event_start_time: '2023-04-28T10:36:14.028Z',
  event_end_time: '2023-04-28T10:37:00.000Z',
};

describe('MaintenanceWindowCallout', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.resetAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('should be visible if currently there is at least one "running" maintenance window', async () => {
    (fetchActiveMaintenanceWindows as jest.Mock).mockResolvedValue([RUNNING_MAINTENANCE_WINDOW_1]);

    const { findByText } = render(<MaintenanceWindowCallout />, { wrapper: TestProviders });

    expect(await findByText('A maintenance window is currently running')).toBeInTheDocument();
  });

  it('single callout should be visible if currently there are multiple "running" maintenance windows', async () => {
    (fetchActiveMaintenanceWindows as jest.Mock).mockResolvedValue([
      RUNNING_MAINTENANCE_WINDOW_1,
      RUNNING_MAINTENANCE_WINDOW_2,
    ]);

    const { findAllByText } = render(<MaintenanceWindowCallout />, { wrapper: TestProviders });

    expect(await findAllByText('A maintenance window is currently running')).toHaveLength(1);
  });

  it('should NOT be visible if currently there are no active (running or upcoming) maintenance windows', async () => {
    (fetchActiveMaintenanceWindows as jest.Mock).mockResolvedValue([]);

    const { container } = render(<MaintenanceWindowCallout />, { wrapper: TestProviders });

    expect(container).toBeEmptyDOMElement();
  });

  it('should NOT be visible if currently there are no "running" maintenance windows', async () => {
    (fetchActiveMaintenanceWindows as jest.Mock).mockResolvedValue([UPCOMING_MAINTENANCE_WINDOW]);

    const { container } = render(<MaintenanceWindowCallout />, { wrapper: TestProviders });

    expect(container).toBeEmptyDOMElement();
  });

  it('should see an error toast if there was an error while fetching maintenance windows', async () => {
    const createReactQueryWrapper = () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            // Turn retries off, otherwise we won't be able to test errors
            retry: false,
          },
        },
      });
      const wrapper: React.FC = ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      return wrapper;
    };

    const mockError = new Error('Network error');
    (fetchActiveMaintenanceWindows as jest.Mock).mockRejectedValue(mockError);

    render(<MaintenanceWindowCallout />, { wrapper: createReactQueryWrapper() });

    await waitFor(() => {
      expect(appToastsMock.addError).toHaveBeenCalledTimes(1);
      expect(appToastsMock.addError).toHaveBeenCalledWith(mockError, {
        title: 'Failed to check if maintenance window is running',
        toastMessage: "Notification actions won't run while a maintenance window is running.",
      });
    });
  });
});
