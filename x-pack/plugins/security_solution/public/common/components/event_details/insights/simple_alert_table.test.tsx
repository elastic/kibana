/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../mock';

import { useAlertsByIds } from '../../../containers/alerts/use_alerts_by_ids';
import { SimpleAlertTable } from './simple_alert_table';

jest.mock('../../../containers/alerts/use_alerts_by_ids', () => ({
  useAlertsByIds: jest.fn(),
}));
const mockUseAlertsByIds = useAlertsByIds as jest.Mock;

const testIds = ['wer34r34', '234234'];
const tooManyTestIds = [
  '234',
  '234',
  '234',
  '234',
  '234',
  '234',
  '234',
  '234',
  '234',
  '234',
  '234',
];
const testResponse = [
  {
    fields: {
      'kibana.alert.rule.name': ['test rule name'],
      '@timestamp': ['2022-07-18T15:07:21.753Z'],
      'kibana.alert.severity': ['high'],
    },
  },
];

describe('SimpleAlertTable', () => {
  it('shows a loading indicator when the data is loading', () => {
    mockUseAlertsByIds.mockReturnValue({
      loading: true,
      error: false,
    });
    render(
      <TestProviders>
        <SimpleAlertTable alertIds={testIds} />
      </TestProviders>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows an error message when there was an error fetching the alerts', () => {
    mockUseAlertsByIds.mockReturnValue({
      loading: false,
      error: true,
    });
    render(
      <TestProviders>
        <SimpleAlertTable alertIds={testIds} />
      </TestProviders>
    );

    expect(screen.getByText(/Failed/)).toBeInTheDocument();
  });

  it('shows the results', () => {
    mockUseAlertsByIds.mockReturnValue({
      loading: false,
      error: false,
      data: testResponse,
    });
    render(
      <TestProviders>
        <SimpleAlertTable alertIds={testIds} />
      </TestProviders>
    );

    // Renders to table headers
    expect(screen.getByRole('columnheader', { name: 'Rule' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '@timestamp' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Severity' })).toBeInTheDocument();

    // Renders the row
    expect(screen.getByText('test rule name')).toBeInTheDocument();
    expect(screen.getByText(/Jul 18/)).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('shows a note about limited results', () => {
    mockUseAlertsByIds.mockReturnValue({
      loading: false,
      error: false,
      data: testResponse,
    });
    render(
      <TestProviders>
        <SimpleAlertTable alertIds={tooManyTestIds} />
      </TestProviders>
    );

    expect(screen.getByText(/Showing only/)).toBeInTheDocument();
  });
});
