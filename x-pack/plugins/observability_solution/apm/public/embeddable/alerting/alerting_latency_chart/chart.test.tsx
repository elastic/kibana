/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { APMAlertingLatencyChart } from './chart';
import { ApmEmbeddableContext } from '../../embeddable_context';
import { MOCK_ALERT, MOCK_RULE, MOCK_DEPS } from '../testing/fixtures';

jest.mock('../../../context/apm_service/use_service_transaction_types_fetcher', () => ({
  useServiceTransactionTypesFetcher: jest.fn(() => ({
    transactionTypes: ['request'],
  })),
}));

jest.mock('../../../context/apm_service/use_service_agent_fetcher', () => ({
  useServiceAgentFetcher: jest.fn(() => ({
    agentName: 'mockAgent',
  })),
}));

describe('renders chart', () => {
  const serviceName = 'ops-bean';
  it('renders error when serviceName is not defined', async () => {
    const { getByText } = render(
      <ApmEmbeddableContext deps={MOCK_DEPS}>
        <APMAlertingLatencyChart
          rule={MOCK_RULE}
          rangeFrom="now-15m"
          rangeTo="now"
          // @ts-ignore
          serviceName={undefined}
          alert={MOCK_ALERT}
        />
      </ApmEmbeddableContext>
    );
    await waitFor(() => {
      expect(getByText('Unable to load the APM visualizations.')).toBeInTheDocument();
    });
  });

  it('renders when serviceName is defined', async () => {
    const { getByText } = render(
      <ApmEmbeddableContext deps={MOCK_DEPS}>
        <APMAlertingLatencyChart
          rule={MOCK_RULE}
          rangeFrom="now-15m"
          rangeTo="now"
          serviceName={serviceName}
          alert={MOCK_ALERT}
        />
      </ApmEmbeddableContext>
    );
    await waitFor(() => {
      expect(getByText('Latency')).toBeInTheDocument();
    });
  });
});
