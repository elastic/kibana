/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceAgent } from './get_service_agent';
import { getServiceTransactionTypes } from './get_service_transaction_types';
import { getServicesItems } from './get_services/get_services_items';
import { hasHistoricalAgentData } from '../historical_data/has_historical_agent_data';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../utils/test_helpers';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';

describe('services queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches the service agent name', async () => {
    mock = await inspectSearchParams(({ mockApmEventClient }) =>
      getServiceAgent({
        serviceName: 'foo',
        apmEventClient: mockApmEventClient,
        start: 0,
        end: 50000,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches the service transaction types', async () => {
    mock = await inspectSearchParams(({ mockApmEventClient }) =>
      getServiceTransactionTypes({
        serviceName: 'foo',
        apmEventClient: mockApmEventClient,
        searchAggregatedTransactions: false,
        start: 0,
        end: 50000,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches the service items', async () => {
    mock = await inspectSearchParams(({ mockApmEventClient }) =>
      getServicesItems({
        mlSetup: undefined,
        apmEventClient: mockApmEventClient,
        searchAggregatedTransactions: false,
        searchAggregatedServiceMetrics: false,
        logger: {} as any,
        environment: ENVIRONMENT_ALL.value,
        kuery: '',
        start: 0,
        end: 50000,
        serviceGroup: null,
        randomSampler: {
          probability: 1,
          seed: 0,
        },
      })
    );

    const allParams = mock.spy.mock.calls.map((call) => call[1]);

    expect(allParams).toMatchSnapshot();
  });

  it('fetches the agent status', async () => {
    mock = await inspectSearchParams(({ mockApmEventClient }) =>
      hasHistoricalAgentData(mockApmEventClient)
    );

    expect(mock.params).toMatchSnapshot();
  });
});
