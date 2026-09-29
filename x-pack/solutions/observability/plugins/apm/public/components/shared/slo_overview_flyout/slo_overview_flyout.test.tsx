/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SloOverviewFlyout } from '.';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmParams, useAnyOfApmParams } from '../../../hooks/use_apm_params';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { mockTelemetryClient } from '../../../services/telemetry/__mocks__/telemetry_client_mock';

vi.mock('@kbn/kibana-react-plugin/public', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_apm_router', () => {
  const mocked = {
    useApmRouter: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_apm_params', () => {
  const mocked = {
    useApmParams: vi.fn(),
    useAnyOfApmParams: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_manage_slos_url', () => {
  const mocked = {
    useManageSlosUrl: () => '/app/slo',
  };
  return { ...mocked, default: mocked };
});

const mockUseFetcher = vi.fn();
vi.mock('../../../hooks/use_fetcher', () => {
  const mocked = {
    useFetcher: () => mockUseFetcher(),
    FETCH_STATUS: {
      LOADING: 'loading',
      SUCCESS: 'success',
      FAILURE: 'failure',
      NOT_INITIATED: 'not_initiated',
    },
    isPending: (status: string) => status === 'loading' || status === 'not_initiated',
  };
  return { ...mocked, default: mocked };
});

vi.mock('@elastic/eui', async () => {
  const actual = await vi.importActual('@elastic/eui');
  return {
    ...actual,
    useGeneratedHtmlId: () => 'test-id',
  };
});

const mockUseKibana = useKibana as Mock;
const mockUseApmRouter = useApmRouter as Mock;
const mockUseApmParams = useApmParams as Mock;
const mockUseAnyOfApmParams = useAnyOfApmParams as Mock;

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
  const mockOnClose = vi.fn();
  const mockLink = vi.fn().mockReturnValue('/services/test-service/overview');
  const mockGetRedirectUrl = vi.fn().mockReturnValue('/app/slo');

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        uiSettings: {
          get: vi.fn().mockReturnValue('0.00%'),
        },
        slo: {
          getSLODetailsFlyout: vi.fn(),
        },
        share: {
          url: {
            locators: {
              get: vi.fn().mockReturnValue({
                getRedirectUrl: mockGetRedirectUrl,
              }),
            },
          },
        },
        telemetry: mockTelemetryClient,
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

    mockUseAnyOfApmParams.mockReturnValue({
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
      refetch: vi.fn(),
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
      refetch: vi.fn(),
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
      refetch: vi.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByText('Latency SLO')).toBeInTheDocument();
    expect(screen.getByText('Error Rate SLO')).toBeInTheDocument();
  });

  it('displays empty state when no SLOs exist', async () => {
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
      refetch: vi.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByTestId('sloOverviewFlyoutEmptyState')).toBeInTheDocument();
    expect(screen.getByText('No SLOs (APM)')).toBeInTheDocument();
    expect(screen.getByTestId('sloOverviewFlyoutCreateSloButton')).toBeInTheDocument();
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
      refetch: vi.fn(),
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
      refetch: vi.fn(),
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
      refetch: vi.fn(),
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
      refetch: vi.fn(),
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
      refetch: vi.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    const nameCell = screen.getByTestId('apmSloNameCell');
    expect(nameCell).toBeInTheDocument();
    // Name cell is no longer an interactive link; clicking it should not open SLO details.
    expect(nameCell.tagName).not.toBe('A');
    expect(nameCell.tagName).not.toBe('BUTTON');

    fireEvent.mouseOver(nameCell);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(sloName);
    });
  });

  it('toggles the expand button between maximize and minimize when clicked', async () => {
    const mockSlos = [createMockSlo({ id: 'slo-1', name: 'Test SLO', instanceId: '*' })];
    const getSLODetailsFlyoutMock = vi.fn(() => null);

    mockUseKibana.mockReturnValue({
      services: {
        uiSettings: { get: vi.fn().mockReturnValue('0.00%') },
        slo: { getSLODetailsFlyout: getSLODetailsFlyoutMock },
        share: {
          url: {
            locators: {
              get: vi.fn().mockReturnValue({ getRedirectUrl: mockGetRedirectUrl }),
            },
          },
        },
        telemetry: mockTelemetryClient,
      },
    });

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
      refetch: vi.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    const expandButton = screen.getByTestId('apmSloExpandButton');
    expect(expandButton).toBeInTheDocument();
    expect(expandButton).toHaveAttribute('aria-label', 'Open SLO details');
    expect(getSLODetailsFlyoutMock).not.toHaveBeenCalled();

    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByTestId('apmSloExpandButton')).toHaveAttribute(
        'aria-label',
        'Close SLO details'
      );
    });
    expect(getSLODetailsFlyoutMock).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('apmSloExpandButton'));

    await waitFor(() => {
      expect(screen.getByTestId('apmSloExpandButton')).toHaveAttribute(
        'aria-label',
        'Open SLO details'
      );
    });
  });

  it('handles API error gracefully', async () => {
    mockUseFetcher.mockReturnValue({
      data: undefined,
      status: FETCH_STATUS.FAILURE,
      error: new Error('API Error'),
      refetch: vi.fn(),
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByTestId('sloOverviewFlyoutEmptyState')).toBeInTheDocument();
  });
});
