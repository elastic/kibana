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
    mock = await inspectSearchParams((setup) =>
      getServiceAgent({
        serviceName: 'foo',
        setup,
        start: 0,
        end: 50000,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches the service transaction types', async () => {
    mock = await inspectSearchParams((setup) =>
      getServiceTransactionTypes({
        serviceName: 'foo',
        setup,
        searchAggregatedTransactions: false,
        start: 0,
        end: 50000,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches the service items', async () => {
    mock = await inspectSearchParams((setup) =>
      getServicesItems({
        setup,
        searchAggregatedTransactions: false,
        logger: {} as any,
        environment: ENVIRONMENT_ALL.value,
        kuery: '',
        start: 0,
        end: 50000,
        serviceGroup: null,
        probability: 1,
      })
    );

    const allParams = mock.spy.mock.calls.map((call) => call[1]);

    expect(allParams).toMatchSnapshot();
  });

  it('fetches the agent status', async () => {
    mock = await inspectSearchParams((setup) => hasHistoricalAgentData(setup));

    expect(mock.params).toMatchSnapshot();
  });
});
