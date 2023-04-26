/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MaintenanceWindowStatus } from '@kbn/alerting-plugin/common';
import type { MaintenanceWindow } from '@kbn/alerting-plugin/common';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { MaintenanceWindowCallout } from './maintenance_window_callout';
import { TestProviders } from '../../../../common/mock';
import { fetchActiveMaintenanceWindows } from './api';

jest.mock('../../../../common/hooks/use_app_toasts');

jest.mock('./api', () => ({
  fetchActiveMaintenanceWindows: jest.fn(() => Promise.resolve([])),
}));

const RUNNING_MAINTENANCE_WINDOW_1: Partial<MaintenanceWindow> = {
  title: 'Maintenance window 1',
  id: '63057284-ac31-42ba-fe22-adfe9732e5ae',
  status: MaintenanceWindowStatus.Running,
  events: [{ gte: '2023-04-20T16:27:30.753Z', lte: '2023-04-20T16:57:30.753Z' }],
};

const RUNNING_MAINTENANCE_WINDOW_2: Partial<MaintenanceWindow> = {
  title: 'Maintenance window 2',
  id: '45894340-df98-11ed-ac81-bfcb4982b4fd',
  status: MaintenanceWindowStatus.Running,
  events: [{ gte: '2023-04-20T16:47:42.871Z', lte: '2023-04-20T17:11:32.192Z' }],
};

const UPCOMING_MAINTENANCE_WINDOW: Partial<MaintenanceWindow> = {
  title: 'Upcoming maintenance window',
  id: '5eafe070-e030-11ed-ac81-bfcb4982b4fd',
  status: MaintenanceWindowStatus.Upcoming,
  events: [
    { gte: '2023-04-21T10:36:14.028Z', lte: '2023-04-21T10:37:00.000Z' },
    { gte: '2023-04-28T10:36:14.028Z', lte: '2023-04-28T10:37:00.000Z' },
  ],
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

  it('should be visible if currently there are multiple "running" maintenance windows', async () => {
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
        logger: {
          // Turn network error logging off, so we don't log the failed request to the console
          error: () => {},
          // eslint-disable-next-line no-console
          log: console.log,
          // eslint-disable-next-line no-console
          warn: console.warn,
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
        title: 'Failed to check if any maintenance window is currently running',
        toastMessage: "Notification actions won't run while a maintenance window is running.",
      });
    });
  });
});
