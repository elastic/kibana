/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  inspectSearchParams,
  SearchParamsMock,
} from '../../utils/test_helpers';
import { getTransactionBreakdown } from './breakdown';
import { getTransactionDistribution } from './distribution';
import { getTransaction } from './get_transaction';

describe('transaction queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches breakdown data for transactions', async () => {
    mock = await inspectSearchParams((setup) =>
      getTransactionBreakdown({
        serviceName: 'foo',
        transactionType: 'bar',
        setup,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches breakdown data for transactions for a transaction name', async () => {
    mock = await inspectSearchParams((setup) =>
      getTransactionBreakdown({
        serviceName: 'foo',
        transactionType: 'bar',
        transactionName: 'baz',
        setup,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches transaction distribution', async () => {
    mock = await inspectSearchParams((setup) =>
      getTransactionDistribution({
        serviceName: 'foo',
        transactionName: 'bar',
        transactionType: 'baz',
        traceId: 'qux',
        transactionId: 'quz',
        setup,
        searchAggregatedTransactions: false,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches a transaction', async () => {
    mock = await inspectSearchParams((setup) =>
      getTransaction({ transactionId: 'foo', traceId: 'bar', setup })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
