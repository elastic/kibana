/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { render, waitFor } from '@testing-library/react';
import { APMAlertingThroughputChart } from './chart';
import { ApmEmbeddableContext } from '../../embeddable_context';
import { MOCK_ALERT, MOCK_RULE, MOCK_DEPS } from '../testing/fixtures';
import * as transactionFetcher from '../../../context/apm_service/use_service_transaction_types_fetcher';

jest.mock('../../../context/apm_service/use_service_agent_fetcher', () => ({
  useServiceAgentFetcher: jest.fn(() => ({
    agentName: 'mockAgent',
  })),
}));

describe('renders chart', () => {
  const serviceName = 'ops-bean';

  beforeEach(() => {
    jest
      .spyOn(transactionFetcher, 'useServiceTransactionTypesFetcher')
      .mockReturnValue({ transactionTypes: ['request'], status: FETCH_STATUS.SUCCESS });
  });

  it('renders error when serviceName is not defined', async () => {
    const { getByText } = render(
      <ApmEmbeddableContext deps={MOCK_DEPS}>
        <APMAlertingThroughputChart
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
        <APMAlertingThroughputChart
          rule={MOCK_RULE}
          rangeFrom="now-15m"
          rangeTo="now"
          serviceName={serviceName}
          alert={MOCK_ALERT}
        />
      </ApmEmbeddableContext>
    );
    await waitFor(() => {
      expect(getByText('Throughput')).toBeInTheDocument();
    });
  });

  it('supports custom transactionType when transactionType is included in transaction types list', async () => {
    jest
      .spyOn(transactionFetcher, 'useServiceTransactionTypesFetcher')
      .mockReturnValue({ transactionTypes: ['request', 'custom'], status: FETCH_STATUS.SUCCESS });
    const { getByText } = render(
      <ApmEmbeddableContext deps={MOCK_DEPS}>
        <APMAlertingThroughputChart
          rule={MOCK_RULE}
          rangeFrom="now-15m"
          rangeTo="now"
          serviceName={serviceName}
          alert={MOCK_ALERT}
          transactionType="custom"
        />
      </ApmEmbeddableContext>
    );
    await waitFor(() => {
      expect(getByText('custom')).toBeInTheDocument();
    });
  });

  it('does not support custom transactionType when transactionType is not included in transaction types list', async () => {
    jest
      .spyOn(transactionFetcher, 'useServiceTransactionTypesFetcher')
      .mockReturnValue({ transactionTypes: ['request'], status: FETCH_STATUS.SUCCESS });
    const { queryByText, getByText } = render(
      <ApmEmbeddableContext deps={MOCK_DEPS}>
        <APMAlertingThroughputChart
          rule={MOCK_RULE}
          rangeFrom="now-15m"
          rangeTo="now"
          serviceName={serviceName}
          alert={MOCK_ALERT}
          transactionType="custom"
        />
      </ApmEmbeddableContext>
    );
    await waitFor(() => {
      expect(queryByText('custom')).not.toBeInTheDocument();
      expect(getByText('request')).toBeInTheDocument();
    });
  });
});
