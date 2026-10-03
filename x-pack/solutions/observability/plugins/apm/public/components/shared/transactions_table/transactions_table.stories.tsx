/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { mockApmApiCallResponse } from '../../../services/rest/storybook_mock_http';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import type { APMServiceContextValue } from '../../../context/apm_service/apm_service_context';
import { TransactionsTable } from '.';

type Args = React.ComponentProps<typeof TransactionsTable>;
type TransactionMainStatsResponse =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics'>;
type TransactionDetailedStatsResponse =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics'>;

const now = Date.now();

const createSeries = (baseValue: number) =>
  Array.from({ length: 20 }, (_, i) => ({
    x: now - (20 - i) * 45000,
    y: baseValue * (0.9 + i * 0.01),
  }));

const mainStatistics: TransactionMainStatsResponse = {
  transactionGroups: [
    {
      alertsCount: 2,
      name: 'GET /api/orders/{id}',
      transactionType: 'request',
      latency: 482.4,
      throughput: 38.1,
      errorRate: 0.042,
      impact: 9.7,
    },
    {
      alertsCount: 0,
      name: 'POST /api/checkout',
      transactionType: 'request',
      latency: 229.9,
      throughput: 61.4,
      errorRate: 0.013,
      impact: 7.1,
    },
    {
      alertsCount: 1,
      name: 'GET /api/search',
      transactionType: 'request',
      latency: 124.3,
      throughput: 104.8,
      errorRate: 0.008,
      impact: 4.8,
    },
  ],
  maxCountExceeded: false,
  transactionOverflowCount: 0,
  hasActiveAlerts: true,
};

const detailedStatistics: TransactionDetailedStatsResponse = {
  currentPeriod: {
    'GET /api/orders/{id}': {
      transactionName: 'GET /api/orders/{id}',
      latency: createSeries(482.4),
      throughput: createSeries(38.1),
      errorRate: createSeries(0.042),
      impact: 9.7,
    },
    'POST /api/checkout': {
      transactionName: 'POST /api/checkout',
      latency: createSeries(229.9),
      throughput: createSeries(61.4),
      errorRate: createSeries(0.013),
      impact: 7.1,
    },
    'GET /api/search': {
      transactionName: 'GET /api/search',
      latency: createSeries(124.3),
      throughput: createSeries(104.8),
      errorRate: createSeries(0.008),
      impact: 4.8,
    },
  },
  previousPeriod: {
    'GET /api/orders/{id}': {
      transactionName: 'GET /api/orders/{id}',
      latency: createSeries(531.0),
      throughput: createSeries(32.2),
      errorRate: createSeries(0.051),
      impact: 8.9,
    },
    'POST /api/checkout': {
      transactionName: 'POST /api/checkout',
      latency: createSeries(248.0),
      throughput: createSeries(56.9),
      errorRate: createSeries(0.02),
      impact: 6.4,
    },
    'GET /api/search': {
      transactionName: 'GET /api/search',
      latency: createSeries(132.6),
      throughput: createSeries(97.1),
      errorRate: createSeries(0.011),
      impact: 4.2,
    },
  },
};

const stories: Meta<Args> = {
  title: 'shared/TransactionsTable',
  component: TransactionsTable,
  parameters: {
    routePath:
      '/services/storybook-service/overview?environment=ENVIRONMENT_ALL&rangeFrom=now-15m&rangeTo=now&comparisonEnabled=true&offset=1d&latencyAggregationType=avg',
    serviceContextValue: {
      serviceName: 'storybook-service',
      transactionType: 'request',
      transactionTypes: ['request'],
      transactionTypeStatus: FETCH_STATUS.SUCCESS,
    } as APMServiceContextValue,
  },
  decorators: [
    (StoryComponent) => {
      mockApmApiCallResponse(
        'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
        () => mainStatistics
      );

      mockApmApiCallResponse(
        'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
        () => detailedStatistics
      );

      return <StoryComponent />;
    },
  ],
};

export default stories;

export const Example: StoryFn<Args> = () => {
  return (
    <TransactionsTable
      environment={ENVIRONMENT_ALL.value}
      kuery=""
      start="2026-06-30T09:00:00.000Z"
      end="2026-06-30T09:15:00.000Z"
      showSparkPlots
      showMaxTransactionGroupsExceededWarning
    />
  );
};
