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

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../../hooks/use_apm_router', () => ({
  useApmRouter: jest.fn(),
}));

jest.mock('../../../hooks/use_apm_params', () => ({
  useApmParams: jest.fn(),
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
  const mockHttpFetch = jest.fn();
  const mockHttpPost = jest.fn();
  const mockLink = jest.fn().mockReturnValue('/services/test-service/overview');
  const mockGetRedirectUrl = jest.fn().mockReturnValue('/app/slo');

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        http: {
          fetch: mockHttpFetch,
          post: mockHttpPost,
        },
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

    mockHttpFetch.mockResolvedValue({
      results: [],
      total: 0,
    });

    mockHttpPost.mockResolvedValue({
      aggregations: {
        perSloId: {
          buckets: [],
        },
      },
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
    mockHttpFetch.mockImplementation(() => new Promise(() => {}));

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

    mockHttpFetch.mockResolvedValue({
      results: mockSlos,
      total: 2,
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Latency SLO')).toBeInTheDocument();
      expect(screen.getByText('Error Rate SLO')).toBeInTheDocument();
    });
  });

  it('displays "No SLOs found" when no data', async () => {
    mockHttpFetch.mockResolvedValue({
      results: [],
      total: 0,
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('No SLOs found for this service')).toBeInTheDocument();
    });
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

  it('fetches SLOs with correct filters for service name', async () => {
    renderWithIntl(<SloOverviewFlyout serviceName="my-service" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockHttpFetch).toHaveBeenCalledWith(
        '/api/observability/slos',
        expect.objectContaining({
          query: expect.objectContaining({
            filters: expect.stringContaining('my-service'),
          }),
        })
      );
    });
  });

  it('fetches SLOs with environment filter', async () => {
    mockUseApmParams.mockReturnValue({
      query: {
        environment: 'production',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
      },
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockHttpFetch).toHaveBeenCalledWith(
        '/api/observability/slos',
        expect.objectContaining({
          query: expect.objectContaining({
            filters: expect.stringContaining('production'),
          }),
        })
      );
    });
  });

  it('displays alerts badge when SLO has active alerts', async () => {
    const mockSlos = [createMockSlo({ id: 'slo-1', name: 'Test SLO', instanceId: '*' })];

    mockHttpFetch.mockResolvedValue({
      results: mockSlos,
      total: 1,
    });

    mockHttpPost.mockResolvedValue({
      aggregations: {
        perSloId: {
          buckets: [{ key: ['slo-1', '*'], key_as_string: 'slo-1|*', doc_count: 3 }],
        },
      },
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('apmSloActiveAlertsBadge')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
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

    mockHttpFetch.mockResolvedValue({
      results: mockSlos,
      total: 25,
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('sloOverviewFlyoutPagination')).toBeInTheDocument();
    });
  });

  it('does not display pagination when total SLOs are within page size', async () => {
    const mockSlos = [createMockSlo({ id: 'slo-1', name: 'Test SLO' })];

    mockHttpFetch.mockResolvedValue({
      results: mockSlos,
      total: 1,
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Test SLO')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('sloOverviewFlyoutPagination')).not.toBeInTheDocument();
  });

  it('renders search input', async () => {
    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    expect(screen.getByTestId('sloOverviewFlyoutSearch')).toBeInTheDocument();
  });

  it('renders the SLO table', async () => {
    const mockSlos = [createMockSlo({ id: 'slo-1', name: 'Test SLO' })];

    mockHttpFetch.mockResolvedValue({
      results: mockSlos,
      total: 1,
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('sloOverviewFlyoutTable')).toBeInTheDocument();
    });
  });

  it('displays tooltip with SLO name on hover', async () => {
    const sloName = 'My Very Long SLO Name That Might Get Truncated';
    const mockSlos = [createMockSlo({ id: 'slo-1', name: sloName })];

    mockHttpFetch.mockResolvedValue({
      results: mockSlos,
      total: 1,
    });

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('apmSloNameLink')).toBeInTheDocument();
    });

    const sloLink = screen.getByTestId('apmSloNameLink');
    fireEvent.mouseOver(sloLink);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(sloName);
    });
  });

  it('handles API error gracefully', async () => {
    mockHttpFetch.mockRejectedValue(new Error('API Error'));

    renderWithIntl(<SloOverviewFlyout serviceName="test-service" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('No SLOs found for this service')).toBeInTheDocument();
    });
  });
});
