/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { DataUsageMetrics } from './data_usage_metrics';
import { useGetDataUsageMetrics } from '../../hooks/use_get_usage_metrics';
import { useGetDataUsageDataStreams } from '../../hooks/use_get_data_streams';
import { coreMock as mockCore } from '@kbn/core/public/mocks';

jest.mock('../../utils/use_breadcrumbs', () => {
  return {
    useBreadcrumbs: jest.fn(),
  };
});

jest.mock('../../utils/use_kibana', () => {
  return {
    useKibanaContextForPlugin: () => ({
      services: mockServices,
    }),
  };
});

jest.mock('../../hooks/use_get_usage_metrics', () => {
  const original = jest.requireActual('../../hooks/use_get_usage_metrics');
  return {
    ...original,
    useGetDataUsageMetrics: jest.fn(original.useGetDataUsageMetrics),
  };
});

const mockUseLocation = jest.fn(() => ({ pathname: '/' }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockUseLocation(),
  useHistory: jest.fn().mockReturnValue({
    push: jest.fn(),
    listen: jest.fn(),
    location: {
      search: '',
    },
  }),
}));

jest.mock('../../hooks/use_get_data_streams', () => {
  const original = jest.requireActual('../../hooks/use_get_data_streams');
  return {
    ...original,
    useGetDataUsageDataStreams: jest.fn(original.useGetDataUsageDataStreams),
  };
});

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useKibana: () => ({
      services: {
        uiSettings: {
          get: jest.fn().mockImplementation((key) => {
            const get = (k: 'dateFormat' | 'timepicker:quickRanges') => {
              const x = {
                dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
                'timepicker:quickRanges': [
                  {
                    from: 'now/d',
                    to: 'now/d',
                    display: 'Today',
                  },
                  {
                    from: 'now/w',
                    to: 'now/w',
                    display: 'This week',
                  },
                  {
                    from: 'now-15m',
                    to: 'now',
                    display: 'Last 15 minutes',
                  },
                  {
                    from: 'now-30m',
                    to: 'now',
                    display: 'Last 30 minutes',
                  },
                  {
                    from: 'now-1h',
                    to: 'now',
                    display: 'Last 1 hour',
                  },
                  {
                    from: 'now-24h',
                    to: 'now',
                    display: 'Last 24 hours',
                  },
                  {
                    from: 'now-7d',
                    to: 'now',
                    display: 'Last 7 days',
                  },
                  {
                    from: 'now-30d',
                    to: 'now',
                    display: 'Last 30 days',
                  },
                  {
                    from: 'now-90d',
                    to: 'now',
                    display: 'Last 90 days',
                  },
                  {
                    from: 'now-1y',
                    to: 'now',
                    display: 'Last 1 year',
                  },
                ],
              };
              return x[k];
            };
            return get(key);
          }),
        },
      },
    }),
  };
});
const mockUseGetDataUsageMetrics = useGetDataUsageMetrics as jest.Mock;
const mockUseGetDataUsageDataStreams = useGetDataUsageDataStreams as jest.Mock;
const mockServices = mockCore.createStart();

const getBaseMockedDataStreams = () => ({
  error: undefined,
  data: undefined,
  isFetching: false,
  refetch: jest.fn(),
});
const getBaseMockedDataUsageMetrics = () => ({
  error: undefined,
  data: undefined,
  isFetching: false,
  refetch: jest.fn(),
});

describe('DataUsageMetrics', () => {
  let user: UserEvent;
  const testId = 'test';
  const testIdFilter = `${testId}-filter`;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });
    mockUseGetDataUsageMetrics.mockReturnValue(getBaseMockedDataUsageMetrics);
    mockUseGetDataUsageDataStreams.mockReturnValue(getBaseMockedDataStreams);
  });

  it('renders', () => {
    const { getByTestId } = render(<DataUsageMetrics data-test-subj={testId} />);
    expect(getByTestId(`${testId}`)).toBeTruthy();
  });

  it('should show date filter', () => {
    const { getByTestId } = render(<DataUsageMetrics data-test-subj={testId} />);
    expect(getByTestId(`${testIdFilter}-date-range`)).toBeTruthy();
    expect(getByTestId(`${testIdFilter}-date-range`).textContent).toContain('Last 24 hours');
    expect(getByTestId(`${testIdFilter}-super-refresh-button`)).toBeTruthy();
  });

  it('should not show data streams filter while fetching API', () => {
    mockUseGetDataUsageDataStreams.mockReturnValue({
      ...getBaseMockedDataStreams,
      isFetching: true,
    });
    const { queryByTestId } = render(<DataUsageMetrics data-test-subj={testId} />);
    expect(queryByTestId(`${testIdFilter}-dataStreams-popoverButton`)).not.toBeTruthy();
  });

  it('should show data streams filter', () => {
    const { getByTestId } = render(<DataUsageMetrics data-test-subj={testId} />);
    expect(getByTestId(`${testIdFilter}-dataStreams-popoverButton`)).toBeTruthy();
  });

  it('should show selected data streams on the filter', () => {
    mockUseGetDataUsageDataStreams.mockReturnValue({
      error: undefined,
      data: [
        {
          name: '.ds-1',
          storageSizeBytes: 10000,
        },
        {
          name: '.ds-2',
          storageSizeBytes: 20000,
        },
        {
          name: '.ds-3',
          storageSizeBytes: 10300,
        },
        {
          name: '.ds-4',
          storageSizeBytes: 23000,
        },
        {
          name: '.ds-5',
          storageSizeBytes: 23200,
        },
      ],
      isFetching: false,
    });
    const { getByTestId } = render(<DataUsageMetrics data-test-subj={testId} />);
    expect(getByTestId(`${testIdFilter}-dataStreams-popoverButton`)).toHaveTextContent(
      'Data streams5'
    );
  });

  it('should allow de-selecting all but one data stream option', async () => {
    mockUseGetDataUsageDataStreams.mockReturnValue({
      error: undefined,
      data: [
        {
          name: '.ds-1',
          storageSizeBytes: 10000,
        },
        {
          name: '.ds-2',
          storageSizeBytes: 20000,
        },
        {
          name: '.ds-3',
          storageSizeBytes: 10300,
        },
        {
          name: '.ds-4',
          storageSizeBytes: 23000,
        },
        {
          name: '.ds-5',
          storageSizeBytes: 23200,
        },
      ],
      isFetching: false,
    });
    const { getByTestId, getAllByTestId } = render(<DataUsageMetrics data-test-subj={testId} />);
    expect(getByTestId(`${testIdFilter}-dataStreams-popoverButton`)).toHaveTextContent(
      'Data streams5'
    );
    await user.click(getByTestId(`${testIdFilter}-dataStreams-popoverButton`));
    const allFilterOptions = getAllByTestId('dataStreams-filter-option');
    for (let i = 0; i < allFilterOptions.length - 1; i++) {
      await user.click(allFilterOptions[i]);
    }

    expect(getByTestId(`${testIdFilter}-dataStreams-popoverButton`)).toHaveTextContent(
      'Data streams1'
    );
  });

  it('should not call usage metrics API if no data streams', async () => {
    mockUseGetDataUsageDataStreams.mockReturnValue({
      ...getBaseMockedDataStreams,
      data: [],
    });
    render(<DataUsageMetrics data-test-subj={testId} />);
    expect(mockUseGetDataUsageMetrics).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ enabled: false })
    );
  });

  it('should show charts loading if data usage metrics API is fetching', () => {
    mockUseGetDataUsageMetrics.mockReturnValue({
      ...getBaseMockedDataUsageMetrics,
      isFetching: true,
    });
    const { getByTestId } = render(<DataUsageMetrics data-test-subj={testId} />);
    expect(getByTestId(`${testId}-charts-loading`)).toBeTruthy();
  });

  it('should show charts', () => {
    mockUseGetDataUsageMetrics.mockReturnValue({
      ...getBaseMockedDataUsageMetrics,
      isFetched: true,
      data: {
        metrics: {
          ingest_rate: [
            {
              name: '.ds-1',
              data: [{ x: new Date(), y: 1000 }],
            },
            {
              name: '.ds-10',
              data: [{ x: new Date(), y: 1100 }],
            },
          ],
          storage_retained: [
            {
              name: '.ds-2',
              data: [{ x: new Date(), y: 2000 }],
            },
            {
              name: '.ds-20',
              data: [{ x: new Date(), y: 2100 }],
            },
          ],
        },
      },
    });
    const { getByTestId } = render(<DataUsageMetrics data-test-subj={testId} />);
    expect(getByTestId(`${testId}-charts`)).toBeTruthy();
  });

  it('should refetch usage metrics with `Refresh` button click', async () => {
    const refetch = jest.fn();
    mockUseGetDataUsageMetrics.mockReturnValue({
      ...getBaseMockedDataUsageMetrics,
      data: ['.ds-1', '.ds-2'],
      isFetched: true,
    });
    mockUseGetDataUsageMetrics.mockReturnValue({
      ...getBaseMockedDataUsageMetrics,
      isFetched: true,
      refetch,
    });
    const { getByTestId } = render(<DataUsageMetrics data-test-subj={testId} />);
    const refreshButton = getByTestId(`${testIdFilter}-super-refresh-button`);
    // click refresh 5 times
    for (let i = 0; i < 5; i++) {
      await user.click(refreshButton);
    }

    expect(mockUseGetDataUsageMetrics).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.objectContaining({ enabled: false })
    );
    expect(refetch).toHaveBeenCalledTimes(5);
  });

  it('should show error toast if usage metrics API fails', async () => {
    mockUseGetDataUsageMetrics.mockReturnValue({
      ...getBaseMockedDataUsageMetrics,
      isFetched: true,
      error: new Error('Uh oh!'),
    });
    render(<DataUsageMetrics data-test-subj={testId} />);
    await waitFor(() => {
      expect(mockServices.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Error getting usage metrics',
        text: 'Uh oh!',
      });
    });
  });

  it('should show error toast if data streams API fails', async () => {
    mockUseGetDataUsageDataStreams.mockReturnValue({
      ...getBaseMockedDataStreams,
      isFetched: true,
      error: new Error('Uh oh!'),
    });
    render(<DataUsageMetrics data-test-subj={testId} />);
    await waitFor(() => {
      expect(mockServices.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Error getting data streams',
        text: 'Uh oh!',
      });
    });
  });
});
