/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ServicesTable } from '.';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { IndexLifecyclePhaseSelectOption } from '../../../../../common/storage_explorer_types';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import type { AgentName } from '../../../../../typings/es_schemas/ui/fields/agent';

// Mock the hooks
const mockUseProgressiveFetcher = jest.fn<any, any>();
const mockUseApmParams = jest.fn<any, any>();
const mockUseTimeRange = jest.fn<any, any>();

jest.mock('../../../../hooks/use_progressive_fetcher', () => ({
  useProgressiveFetcher: () => mockUseProgressiveFetcher(),
}));

jest.mock('../../../../hooks/use_apm_params', () => ({
  useApmParams: () => mockUseApmParams(),
}));

jest.mock('../../../../hooks/use_time_range', () => ({
  useTimeRange: () => mockUseTimeRange(),
}));

// Mock child components
jest.mock('./storage_details_per_service', () => ({
  StorageDetailsPerService: ({ serviceName }: { serviceName: string }) => (
    <div data-test-subj={`storage-details-${serviceName}`}>Storage Details for {serviceName}</div>
  ),
}));

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/storage-explorer']}>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

const renderOptions = {
  wrapper: Wrapper,
};

describe('ServicesTable', () => {
  const mockSummaryStatsData: APIReturnType<'GET /internal/apm/storage_explorer_summary_stats'> = {
    totalSize: 1000000,
    dailyDataGeneration: 50000,
    tracesPerMinute: 100,
    numberOfServices: 3,
    diskSpaceUsedPct: 0.75,
    estimatedIncrementalSize: 150000,
  };

  const defaultParams = {
    query: {
      rangeFrom: 'now-24h',
      rangeTo: 'now',
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      indexLifecyclePhase: IndexLifecyclePhaseSelectOption.All,
    },
  };

  const defaultTimeRange = {
    start: '2023-01-01T00:00:00Z',
    end: '2023-01-02T00:00:00Z',
  };

  const mockServicesData: Array<{
    serviceName: string;
    size: number;
    environments: string[];
    agentName: AgentName;
    sampling: number;
  }> = [
    {
      serviceName: 'opbeans-node',
      size: 500000,
      environments: ['production', 'staging'],
      agentName: 'nodejs' as AgentName,
      sampling: 1.0,
    },
    {
      serviceName: 'opbeans-java',
      size: 300000,
      environments: ['production'],
      agentName: 'java' as AgentName,
      sampling: 1.0,
    },
    {
      serviceName: 'opbeans-rum',
      size: 200000,
      environments: ['production', 'development'],
      agentName: 'rum-js' as AgentName,
      sampling: 0.8,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApmParams.mockReturnValue(defaultParams);
    mockUseTimeRange.mockReturnValue(defaultTimeRange);

    mockUseProgressiveFetcher.mockImplementation((fetchFn) => {
      if (!fetchFn || typeof fetchFn !== 'function') {
        return {
          data: { serviceStatistics: mockServicesData },
          status: FETCH_STATUS.SUCCESS,
        };
      }

      const fnString = fetchFn.toString();
      if (fnString.includes('get_services')) {
        return {
          data: {
            services: mockServicesData.map((service) => ({ serviceName: service.serviceName })),
          },
          status: FETCH_STATUS.SUCCESS,
        };
      } else if (fnString.includes('storage_explorer_summary_stats')) {
        return {
          data: mockSummaryStatsData,
          status: FETCH_STATUS.SUCCESS,
        };
      } else if (fnString.includes('storage_explorer')) {
        return {
          data: { serviceStatistics: mockServicesData },
          status: FETCH_STATUS.SUCCESS,
        };
      }

      return {
        data: { serviceStatistics: mockServicesData },
        status: FETCH_STATUS.SUCCESS,
      };
    });
  });

  describe('Loading State', () => {
    it('displays loading message when data is loading', () => {
      mockUseProgressiveFetcher.mockReturnValue({
        data: undefined,
        status: FETCH_STATUS.LOADING,
      });

      render(
        <ServicesTable summaryStatsData={mockSummaryStatsData} loadingSummaryStats={true} />,
        renderOptions
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows loading spinner when summary stats are loading', () => {
      mockUseProgressiveFetcher.mockImplementation(() => ({
        data: undefined,
        status: FETCH_STATUS.LOADING,
      }));

      render(
        <ServicesTable summaryStatsData={undefined} loadingSummaryStats={true} />,
        renderOptions
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('renders services table with data', () => {
      render(
        <ServicesTable summaryStatsData={mockSummaryStatsData} loadingSummaryStats={false} />,
        renderOptions
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('opbeans-node')).toBeInTheDocument();
      expect(screen.getByText('opbeans-java')).toBeInTheDocument();
      expect(screen.getByText('opbeans-rum')).toBeInTheDocument();
    });

    it('renders download report button', () => {
      render(
        <ServicesTable summaryStatsData={mockSummaryStatsData} loadingSummaryStats={false} />,
        renderOptions
      );
      expect(screen.getByTestId('StorageExplorerDownloadReportButton')).toBeInTheDocument();
      expect(screen.getByTestId('StorageExplorerDownloadReportButton')).toBeEnabled();
    });

    it('displays service names as links', () => {
      render(
        <ServicesTable summaryStatsData={mockSummaryStatsData} loadingSummaryStats={false} />,
        renderOptions
      );

      const serviceLinks = screen.getAllByTestId('apmStorageExplorerServiceLink');
      expect(serviceLinks).toHaveLength(3);

      expect(screen.getAllByTestId('apmStorageExplorerServiceLink')[0]).toBeInTheDocument();
    });

    it('shows environments for each service', () => {
      render(
        <ServicesTable summaryStatsData={mockSummaryStatsData} loadingSummaryStats={false} />,
        renderOptions
      );

      expect(screen.getByText('production')).toBeInTheDocument();
      expect(screen.getAllByText('2 environments')[0]).toBeInTheDocument();
    });

    it('displays storage size information', () => {
      render(
        <ServicesTable summaryStatsData={mockSummaryStatsData} loadingSummaryStats={false} />,
        renderOptions
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Storage Details', () => {
    it('opens storage details when button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ServicesTable summaryStatsData={mockSummaryStatsData} loadingSummaryStats={false} />,
        renderOptions
      );

      const detailsButton = screen.getByTestId('storageDetailsButton_opbeans-node');
      await user.click(detailsButton);

      expect(screen.getByTestId('storage-details-opbeans-node')).toBeInTheDocument();
      expect(screen.getByText('Storage Details for opbeans-node')).toBeInTheDocument();
    });

    it('closes storage details when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ServicesTable summaryStatsData={mockSummaryStatsData} loadingSummaryStats={false} />,
        renderOptions
      );

      const detailsButton = screen.getByTestId('storageDetailsButton_opbeans-node');
      await user.click(detailsButton);

      expect(screen.getByTestId('storage-details-opbeans-node')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /collapse/i });
      await user.click(closeButton);

      expect(screen.queryByTestId('storage-details-opbeans-node')).not.toBeInTheDocument();
    });

    it('can open multiple storage details modals', async () => {
      const user = userEvent.setup();

      render(
        <ServicesTable summaryStatsData={mockSummaryStatsData} loadingSummaryStats={false} />,
        renderOptions
      );

      const nodeButton = screen.getByTestId('storageDetailsButton_opbeans-node');
      const javaButton = screen.getByTestId('storageDetailsButton_opbeans-java');

      await user.click(nodeButton);
      await user.click(javaButton);

      expect(screen.getByTestId('storage-details-opbeans-node')).toBeInTheDocument();
      expect(screen.getByTestId('storage-details-opbeans-java')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays no results message when no services are found', () => {
      mockUseProgressiveFetcher.mockImplementation(() => ({
        data: { serviceStatistics: [] },
        status: FETCH_STATUS.SUCCESS,
      }));

      render(
        <ServicesTable summaryStatsData={mockSummaryStatsData} loadingSummaryStats={false} />,
        renderOptions
      );

      expect(screen.getByText('No data found')).toBeInTheDocument();
    });

    it('handles undefined services data', () => {
      mockUseProgressiveFetcher.mockImplementation(() => ({
        data: undefined,
        status: FETCH_STATUS.SUCCESS,
      }));

      render(
        <ServicesTable summaryStatsData={mockSummaryStatsData} loadingSummaryStats={false} />,
        renderOptions
      );

      expect(screen.getByText('No data found')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', () => {
      mockUseProgressiveFetcher.mockImplementation(() => ({
        data: undefined,
        status: FETCH_STATUS.FAILURE,
        error: new Error('API Error'),
      }));

      render(
        <ServicesTable summaryStatsData={mockSummaryStatsData} loadingSummaryStats={false} />,
        renderOptions
      );

      expect(screen.getByText('No data found')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        serviceName: `service-${i + 1}`,
        size: Math.random() * 1000000,
        environments: i % 2 === 0 ? ['production'] : ['production', 'staging'],
        agentName: (i % 3 === 0 ? 'nodejs' : i % 3 === 1 ? 'java' : 'python') as AgentName,
        sampling: Math.random(),
      }));
      mockUseProgressiveFetcher.mockReturnValue({
        data: { serviceStatistics: largeDataset },
        status: FETCH_STATUS.SUCCESS,
      });

      const startTime = performance.now();

      render(
        <ServicesTable summaryStatsData={mockSummaryStatsData} loadingSummaryStats={false} />,
        renderOptions
      );

      const endTime = performance.now();

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
