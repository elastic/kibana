/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SloOverviewFlyout } from '.';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmParams } from '../../../hooks/use_apm_params';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../../hooks/use_apm_router', () => ({
  useApmRouter: jest.fn(),
}));

jest.mock('../../../hooks/use_apm_params', () => ({
  useApmParams: jest.fn(),
}));

const mockUseFetcher = jest.fn();
jest.mock('../../../hooks/use_fetcher', () => ({
  useFetcher: () => mockUseFetcher(),
  FETCH_STATUS: {
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILURE: 'failure',
    NOT_INITIATED: 'not_initiated',
  },
  isPending: (status: string) => status === 'loading' || status === 'not_initiated',
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useGeneratedHtmlId: () => 'test-id',
  };
});

const mockUseKibana = useKibana as jest.Mock;
const mockUseApmRouter = useApmRouter as jest.Mock;
const mockUseApmParams = useApmParams as jest.Mock;

const createMockSlo = (overrides: Partial<SLOWithSummaryResponse> = {}): SLOWithSummaryResponse =>
  ({
    id: 'slo-1',
    name: 'Test SLO',
    instanceId: '*',
    objective: { target: 0.99 },
    summary: {
      status: 'HEALTHY',
      sliValue: 0.995,
      errorBudget: {
        initial: 0.01,
        consumed: 0.5,
        remaining: 0.5,
        isEstimated: false,
      },
    },
    ...overrides,
  } as SLOWithSummaryResponse);

const renderWithIntl = (component: React.ReactElement) => {
  return render(<IntlProvider locale="en">{component}</IntlProvider>);
};

describe('SloOverviewFlyout', () => {
  const mockOnClose = jest.fn();
  const mockLink = jest.fn().mockReturnValue('/services/test-service/overview');
  const mockGetRedirectUrl = jest.fn().mockReturnValue('/app/slo');

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        uiSettings: {
          get: jest.fn().mockReturnValue('0.00%'),
        },
        slo: {
          getSLODetailsFlyout: jest.fn(),
        },
        share: {
          url: {
            locators: {
              get: jest.fn().mockReturnValue({
                getRedirectUrl: mockGetRedirectUrl,
              }),
            },
          },
        },
      },
    });

    mockUseApmRouter.mockReturnValue({
      link: mockLink,
    });

    mockUseApmParams.mockReturnValue({
      query: {
        environment: 'production',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
      },
    });

    mockUseFetcher.mockReturnValue({
      data: {
        results: [],
        total: 0,
        page: 1,
        perPage: 10,
        activeAlerts: {},
        statusCounts: { violated: 0, degrading: 0, healthy: 0, noData: 0 },
      },
      status: FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
  });

  it('renders the flyout with service name', async () => {
    renderWithIntl(
      <SloOverviewFlyout serviceName="test-service" agentName="nodejs" onClose={mockOnClose} />
    );

    expect(screen.getByText('SLOs')).toBeInTheDocument();
    expect(screen.getByText('test-service')).toBeInTheDocument();
  });

  it('calls onClose when flyout close button is clicked', async () => {
    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays loading state initially', async () => {
    mockUseFetcher.mockReturnValue({
      data: undefined,
      status: FETCH_STATUS.LOADING,
      refetch: jest.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByText('Loading SLOs...')).toBeInTheDocument();
  });

  it('displays SLOs when data is loaded', async () => {
    const mockSlos = [
      createMockSlo({
        id: 'slo-1',
        name: 'Latency SLO',
        summary: {
          status: 'HEALTHY',
          sliValue: 0.995,
          errorBudget: { initial: 0.01, consumed: 0.5, remaining: 0.5, isEstimated: false },
          fiveMinuteBurnRate: 0.2,
          oneHourBurnRate: 0.15,
          oneDayBurnRate: 0.12,
        },
      }),
      createMockSlo({
        id: 'slo-2',
        name: 'Error Rate SLO',
        summary: {
          status: 'VIOLATED',
          sliValue: 0.85,
          errorBudget: { initial: 0.01, consumed: 1.5, remaining: -0.5, isEstimated: false },
          fiveMinuteBurnRate: 0.3,
          oneHourBurnRate: 0.25,
          oneDayBurnRate: 0.22,
        },
      }),
    ];

    mockUseFetcher.mockReturnValue({
      data: {
        results: mockSlos,
        total: 2,
        page: 1,
        perPage: 10,
        activeAlerts: {},
        statusCounts: { violated: 1, degrading: 0, healthy: 1, noData: 0 },
      },
      status: FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByText('Latency SLO')).toBeInTheDocument();
    expect(screen.getByText('Error Rate SLO')).toBeInTheDocument();
  });

  it('displays "No SLOs found" when no data', async () => {
    mockUseFetcher.mockReturnValue({
      data: {
        results: [],
        total: 0,
        page: 1,
        perPage: 10,
        activeAlerts: {},
        statusCounts: { violated: 0, degrading: 0, healthy: 0, noData: 0 },
      },
      status: FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByText('No SLOs found for this service')).toBeInTheDocument();
  });

  it('displays status stats panel', async () => {
    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByText('Violated')).toBeInTheDocument();
    expect(screen.getByText('Degrading')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('opens status filter popover when filter button is clicked', async () => {
    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    const filterButton = screen.getByTestId('sloOverviewFlyoutStatusFilterButton');
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByTestId('sloOverviewFlyoutStatusSelectable')).toBeInTheDocument();
    });
  });

  it('renders correctly with service name prop', async () => {
    renderWithIntl(<SloOverviewFlyout serviceName="my-service" onClose={mockOnClose} />);

    expect(screen.getByText('my-service')).toBeInTheDocument();
  });

  it('renders correctly with environment from params', async () => {
    mockUseApmParams.mockReturnValue({
      query: {
        environment: 'production',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
      },
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByText('test-service')).toBeInTheDocument();
  });

  it('displays alerts badge when SLO has active alerts', async () => {
    const mockSlos = [createMockSlo({ id: 'slo-1', name: 'Test SLO', instanceId: '*' })];

    mockUseFetcher.mockReturnValue({
      data: {
        results: mockSlos,
        total: 1,
        page: 1,
        perPage: 10,
        activeAlerts: { 'slo-1|*': 3 },
        statusCounts: { violated: 0, degrading: 0, healthy: 1, noData: 0 },
      },
      status: FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByTestId('apmSloActiveAlertsBadge')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders service link badge', async () => {
    renderWithIntl(
      <SloOverviewFlyout serviceName="test-service" agentName="nodejs" onClose={mockOnClose} />
    );

    const serviceLink = screen.getByTestId('sloOverviewFlyoutServiceLink');
    expect(serviceLink).toBeInTheDocument();
    expect(serviceLink).toHaveTextContent('test-service');
  });

  it('renders SLO app link in header', async () => {
    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    const sloLink = screen.getByTestId('sloOverviewFlyoutSloLink');
    expect(sloLink).toBeInTheDocument();
    expect(sloLink).toHaveAttribute('href', '/app/slo');
  });

  it('displays pagination when total SLOs exceed page size', async () => {
    const mockSlos = Array.from({ length: 10 }, (_, i) =>
      createMockSlo({ id: `slo-${i}`, name: `SLO ${i}` })
    );

    mockUseFetcher.mockReturnValue({
      data: {
        results: mockSlos,
        total: 25,
        page: 1,
        perPage: 10,
        activeAlerts: {},
        statusCounts: { violated: 0, degrading: 0, healthy: 25, noData: 0 },
      },
      status: FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByTestId('sloOverviewFlyoutPagination')).toBeInTheDocument();
  });

  it('does not display pagination when total SLOs are within page size', async () => {
    const mockSlos = [createMockSlo({ id: 'slo-1', name: 'Test SLO' })];

    mockUseFetcher.mockReturnValue({
      data: {
        results: mockSlos,
        total: 1,
        page: 1,
        perPage: 10,
        activeAlerts: {},
        statusCounts: { violated: 0, degrading: 0, healthy: 1, noData: 0 },
      },
      status: FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByText('Test SLO')).toBeInTheDocument();
    expect(screen.queryByTestId('sloOverviewFlyoutPagination')).not.toBeInTheDocument();
  });

  it('renders search input', async () => {
    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByTestId('sloOverviewFlyoutSearch')).toBeInTheDocument();
  });

  it('renders the SLO table', async () => {
    const mockSlos = [createMockSlo({ id: 'slo-1', name: 'Test SLO' })];

    mockUseFetcher.mockReturnValue({
      data: {
        results: mockSlos,
        total: 1,
        page: 1,
        perPage: 10,
        activeAlerts: {},
        statusCounts: { violated: 0, degrading: 0, healthy: 1, noData: 0 },
      },
      status: FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByTestId('sloOverviewFlyoutTable')).toBeInTheDocument();
  });

  it('displays tooltip with SLO name on hover', async () => {
    const sloName = 'My Very Long SLO Name That Might Get Truncated';
    const mockSlos = [createMockSlo({ id: 'slo-1', name: sloName })];

    mockUseFetcher.mockReturnValue({
      data: {
        results: mockSlos,
        total: 1,
        page: 1,
        perPage: 10,
        activeAlerts: {},
        statusCounts: { violated: 0, degrading: 0, healthy: 1, noData: 0 },
      },
      status: FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByTestId('apmSloNameLink')).toBeInTheDocument();

    const sloLink = screen.getByTestId('apmSloNameLink');
    fireEvent.mouseOver(sloLink);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(sloName);
    });
  });

  it('handles API error gracefully', async () => {
    mockUseFetcher.mockReturnValue({
      data: undefined,
      status: FETCH_STATUS.FAILURE,
      error: new Error('API Error'),
      refetch: jest.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByText('No SLOs found for this service')).toBeInTheDocument();
  });
});
