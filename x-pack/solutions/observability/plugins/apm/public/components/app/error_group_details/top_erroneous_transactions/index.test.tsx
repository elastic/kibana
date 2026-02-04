/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TopErroneousTransactions } from '.';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

// Mock the hooks
const mockUseFetcher = jest.fn();
const mockUseApmParams = jest.fn();
const mockUseApmRouter = jest.fn();
const mockUseTimeRange = jest.fn();

jest.mock('../../../../hooks/use_fetcher', () => ({
  useFetcher: () => mockUseFetcher(),
  FETCH_STATUS: {
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILURE: 'failure',
    NOT_INITIATED: 'not_initiated',
  },
  isPending: jest.fn((status) => status === 'loading'),
}));

jest.mock('../../../../hooks/use_apm_params', () => ({
  useApmParams: () => mockUseApmParams(),
}));

jest.mock('../../../../hooks/use_apm_router', () => ({
  useApmRouter: () => mockUseApmRouter(),
}));

jest.mock('../../../../hooks/use_time_range', () => ({
  useTimeRange: () => mockUseTimeRange(),
}));

// Mock SparkPlot to simplify testing
jest.mock('../../../shared/charts/spark_plot', () => ({
  SparkPlot: ({ valueLabel }: { valueLabel: string }) => (
    <div data-test-subj="spark-plot">{valueLabel}</div>
  ),
}));

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/services/test-service/errors/test-group-id']}>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

const renderOptions = {
  wrapper: Wrapper,
};

describe('TopErroneousTransactions', () => {
  const defaultParams = {
    path: { groupId: 'test-group-id' },
    query: {
      rangeFrom: 'now-24h',
      rangeTo: 'now',
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      comparisonEnabled: false,
      offset: undefined,
    },
  };

  const defaultTimeRange = {
    start: '2023-01-01T00:00:00Z',
    end: '2023-01-02T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApmParams.mockReturnValue(defaultParams);
    mockUseTimeRange.mockReturnValue(defaultTimeRange);
    mockUseApmRouter.mockReturnValue({
      link: jest.fn(() => '/test-link'),
    });
  });

  describe('Title', () => {
    it('displays the title', () => {
      mockUseFetcher.mockReturnValue({
        data: { topErroneousTransactions: [] },
        status: FETCH_STATUS.SUCCESS,
      });

      render(<TopErroneousTransactions serviceName="test-service" />, renderOptions);

      expect(screen.getByText('Top 5 affected transactions')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('displays loading message when fetching data', () => {
      mockUseFetcher.mockReturnValue({
        data: undefined,
        status: FETCH_STATUS.LOADING,
      });

      render(<TopErroneousTransactions serviceName="test-service" />, renderOptions);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays empty message when no transactions found', () => {
      mockUseFetcher.mockReturnValue({
        data: { topErroneousTransactions: [] },
        status: FETCH_STATUS.SUCCESS,
      });

      render(<TopErroneousTransactions serviceName="test-service" />, renderOptions);

      expect(screen.getByText('No errors found associated with transactions')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when fetch fails', () => {
      mockUseFetcher.mockReturnValue({
        data: undefined,
        status: FETCH_STATUS.FAILURE,
      });

      render(<TopErroneousTransactions serviceName="test-service" />, renderOptions);

      expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('displays transaction data when fetch succeeds', () => {
      mockUseFetcher.mockReturnValue({
        data: {
          topErroneousTransactions: [
            {
              transactionName: 'GET /api/users',
              transactionType: 'request',
              occurrences: 10,
              currentPeriodTimeseries: [],
              previousPeriodTimeseries: [],
            },
            {
              transactionName: 'POST /api/orders',
              transactionType: 'request',
              occurrences: 5,
              currentPeriodTimeseries: [],
              previousPeriodTimeseries: [],
            },
          ],
        },
        status: FETCH_STATUS.SUCCESS,
      });

      render(<TopErroneousTransactions serviceName="test-service" />, renderOptions);

      expect(screen.getByText('GET /api/users')).toBeInTheDocument();
      expect(screen.getByText('POST /api/orders')).toBeInTheDocument();
    });

    it('displays occurrences count in SparkPlot', () => {
      mockUseFetcher.mockReturnValue({
        data: {
          topErroneousTransactions: [
            {
              transactionName: 'GET /api/users',
              transactionType: 'request',
              occurrences: 42,
              currentPeriodTimeseries: [],
              previousPeriodTimeseries: [],
            },
          ],
        },
        status: FETCH_STATUS.SUCCESS,
      });

      render(<TopErroneousTransactions serviceName="test-service" />, renderOptions);

      expect(screen.getByText('42 occ.')).toBeInTheDocument();
    });
  });
});
