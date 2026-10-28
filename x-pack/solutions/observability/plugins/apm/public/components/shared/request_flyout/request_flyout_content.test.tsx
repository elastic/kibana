/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderInRequestFlyout } from './test_utils';
import { RequestFlyoutBody } from './request_flyout_content';

jest.mock('./failed_calls', () => ({ RequestFlyoutFailedCalls: () => <div>failed calls</div> }));
jest.mock('./latency_distribution', () => ({
  RequestFlyoutLatencyDistribution: () => <div>latency distribution</div>,
}));
jest.mock('./operations', () => ({ RequestFlyoutOperations: () => <div>operations</div> }));
jest.mock('./red_metrics', () => ({ RequestFlyoutRedMetrics: () => <div>red metrics</div> }));
jest.mock('./resources', () => ({ RequestFlyoutResources: () => <div>resources</div> }));
jest.mock('./transactions', () => ({ RequestFlyoutTransactions: () => <div>transactions</div> }));

const content = <RequestFlyoutBody />;

const connection = {
  sourceServiceName: 'frontend',
  sourceLabel: 'frontend',
  targetLabel: 'postgresql',
  dependencies: ['postgresql'],
  dependencyName: 'postgresql',
};

describe('RequestFlyoutContent', () => {
  it('shows the operations and failed calls of a service → dependency edge', () => {
    renderInRequestFlyout(content, { connection });

    expect(screen.getByTestId('requestFlyoutOperationsTitle')).toHaveTextContent('Operations');
    expect(screen.getByText('operations')).toBeInTheDocument();
    expect(screen.getByText('failed calls')).toBeInTheDocument();
    expect(screen.getByText('red metrics')).toBeInTheDocument();
    expect(screen.queryByText('transactions')).not.toBeInTheDocument();
  });

  it('shows the transactions of a service → service edge', () => {
    renderInRequestFlyout(content, {
      connection: { ...connection, targetServiceName: 'backend', dependencyName: undefined },
    });

    expect(screen.getByTestId('requestFlyoutTransactionsTitle')).toHaveTextContent('Transactions');
    expect(screen.getByText('transactions')).toBeInTheDocument();
    expect(screen.queryByText('operations')).not.toBeInTheDocument();
  });

  it('only lists the resources of a grouped edge', () => {
    renderInRequestFlyout(content, {
      connection: {
        ...connection,
        groupedResources: [{ resource: 'a', spanType: 'external', spanSubtype: 'http' }],
      },
    });

    expect(screen.getByText('resources')).toBeInTheDocument();
    expect(screen.queryByText('operations')).not.toBeInTheDocument();
    expect(screen.queryByText('failed calls')).not.toBeInTheDocument();
  });

  it('does not render the metrics of a connection whose resources are unknown', () => {
    renderInRequestFlyout(content, {
      connection: { ...connection, dependencies: [], dependencyName: undefined },
    });

    expect(screen.getByTestId('requestFlyoutMetricsNotAvailable')).toBeInTheDocument();
    expect(screen.queryByText('red metrics')).not.toBeInTheDocument();
    expect(screen.queryByText('latency distribution')).not.toBeInTheDocument();
  });
});
