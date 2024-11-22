/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { TestProvider } from '../../../common/test_utils';
import { render, waitFor, within, type RenderResult } from '@testing-library/react';
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

const generateDataStreams = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    name: `.ds-${i}`,
    storageSizeBytes: 1024 ** 2 * (22 / 7),
  }));
};

describe('DataUsageMetrics', () => {
  let user: UserEvent;
  const testId = 'test';
  const testIdFilter = `${testId}-filter`;
  let renderComponent: () => RenderResult;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    renderComponent = () =>
      render(
        <TestProvider>
          <DataUsageMetrics data-test-subj={testId} />
        </TestProvider>
      );
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });
    mockUseGetDataUsageMetrics.mockReturnValue(getBaseMockedDataUsageMetrics);
    mockUseGetDataUsageDataStreams.mockReturnValue(getBaseMockedDataStreams);
  });

  it('renders', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId(`${testId}`)).toBeTruthy();
  });

  it('should show date filter', () => {
    const { getByTestId } = renderComponent();
    const dateFilter = getByTestId(`${testIdFilter}-date-range`);
    expect(dateFilter).toBeTruthy();
    expect(dateFilter.textContent).toContain('to');
    expect(getByTestId(`${testIdFilter}-super-refresh-button`)).toBeTruthy();
  });

  it('should not show data streams filter while fetching API', () => {
    mockUseGetDataUsageDataStreams.mockReturnValue({
      ...getBaseMockedDataStreams,
      isFetching: true,
    });
    const { queryByTestId } = renderComponent();
    expect(queryByTestId(`${testIdFilter}-dataStreams-popoverButton`)).not.toBeTruthy();
  });

  it('should show data streams filter', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId(`${testIdFilter}-dataStreams-popoverButton`)).toBeTruthy();
  });

  it('should show selected data streams on the filter', () => {
    mockUseGetDataUsageDataStreams.mockReturnValue({
      error: undefined,
      data: generateDataStreams(5),
      isFetching: false,
    });
    const { getByTestId } = renderComponent();
    expect(getByTestId(`${testIdFilter}-dataStreams-popoverButton`)).toHaveTextContent(
      'Data streams5'
    );
  });

  it('should show at most 50 selected data streams on the filter', async () => {
    mockUseGetDataUsageDataStreams.mockReturnValue({
      error: undefined,
      data: generateDataStreams(100),
      isFetching: false,
    });
    const { getByTestId } = renderComponent();
    const toggleFilterButton = getByTestId(`${testIdFilter}-dataStreams-popoverButton`);

    expect(toggleFilterButton).toHaveTextContent('Data streams50');
  });

  it('should allow de-selecting data stream options', async () => {
    mockUseGetDataUsageDataStreams.mockReturnValue({
      error: undefined,
      data: generateDataStreams(10),
      isFetching: false,
    });
    const { getByTestId, getAllByTestId } = renderComponent();
    const toggleFilterButton = getByTestId(`${testIdFilter}-dataStreams-popoverButton`);

    expect(toggleFilterButton).toHaveTextContent('Data streams10');
    await user.click(toggleFilterButton);
    const allFilterOptions = getAllByTestId('dataStreams-filter-option');
    // deselect 9 options
    for (let i = 0; i < allFilterOptions.length; i++) {
      await user.click(allFilterOptions[i]);
    }

    expect(toggleFilterButton).toHaveTextContent('Data streams1');
    expect(within(toggleFilterButton).getByRole('marquee').getAttribute('aria-label')).toEqual(
      '1 active filters'
    );
  });

  it('should allow selecting/deselecting all data stream options using `select all` and `clear all`', async () => {
    mockUseGetDataUsageDataStreams.mockReturnValue({
      error: undefined,
      data: generateDataStreams(10),
      isFetching: false,
    });
    const { getByTestId } = renderComponent();
    const toggleFilterButton = getByTestId(`${testIdFilter}-dataStreams-popoverButton`);

    expect(toggleFilterButton).toHaveTextContent('Data streams10');
    await user.click(toggleFilterButton);

    // all options are selected on load
    expect(within(toggleFilterButton).getByRole('marquee').getAttribute('aria-label')).toEqual(
      '10 active filters'
    );

    const selectAllButton = getByTestId(`${testIdFilter}-dataStreams-selectAllButton`);
    const clearAllButton = getByTestId(`${testIdFilter}-dataStreams-clearAllButton`);

    // select all is disabled
    expect(selectAllButton).toBeTruthy();
    expect(selectAllButton.getAttribute('disabled')).not.toBeNull();

    // clear all is enabled
    expect(clearAllButton).toBeTruthy();
    expect(clearAllButton.getAttribute('disabled')).toBeNull();
    // click clear all and expect all options to be deselected
    await user.click(clearAllButton);
    expect(within(toggleFilterButton).getByRole('marquee').getAttribute('aria-label')).toEqual(
      '10 available filters'
    );
    // select all is enabled again
    expect(await selectAllButton.getAttribute('disabled')).toBeNull();
    // click select all
    await user.click(selectAllButton);

    // all options are selected and clear all is disabled
    expect(within(toggleFilterButton).getByRole('marquee').getAttribute('aria-label')).toEqual(
      '10 active filters'
    );
  });

  it('should not call usage metrics API if no data streams', async () => {
    mockUseGetDataUsageDataStreams.mockReturnValue({
      ...getBaseMockedDataStreams,
      data: [],
    });
    renderComponent();
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
    const { getByTestId } = renderComponent();
    expect(getByTestId(`${testId}-charts-loading`)).toBeTruthy();
  });

  it('should show charts', () => {
    mockUseGetDataUsageMetrics.mockReturnValue({
      ...getBaseMockedDataUsageMetrics,
      isFetched: true,
      data: {
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
    });
    const { getByTestId } = renderComponent();
    expect(getByTestId(`${testId}-charts`)).toBeTruthy();
  });

  it('should show no charts callout', () => {
    mockUseGetDataUsageMetrics.mockReturnValue({
      ...getBaseMockedDataUsageMetrics,
      isFetched: false,
    });
    const { getByTestId } = renderComponent();
    expect(getByTestId(`${testId}-no-charts-callout`)).toBeTruthy();
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
    const { getByTestId } = renderComponent();
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
    renderComponent();
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
    renderComponent();
    await waitFor(() => {
      expect(mockServices.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Error getting data streams',
        text: 'Uh oh!',
      });
    });
  });
});
