/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTransactionBreakdown } from './breakdown';
import { getTransactionCharts } from './charts';
import { getTransactionDistribution } from './distribution';
import { getTransaction } from './get_transaction';
import {
  SearchParamsMock,
  inspectSearchParams
} from '../../../public/utils/testHelpers';

describe('transaction queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches breakdown data for transactions', async () => {
    mock = await inspectSearchParams(setup =>
      getTransactionBreakdown({
        serviceName: 'foo',
        transactionType: 'bar',
        setup
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches breakdown data for transactions for a transaction name', async () => {
    mock = await inspectSearchParams(setup =>
      getTransactionBreakdown({
        serviceName: 'foo',
        transactionType: 'bar',
        transactionName: 'baz',
        setup
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches transaction charts', async () => {
    mock = await inspectSearchParams(setup =>
      getTransactionCharts({
        serviceName: 'foo',
        transactionName: undefined,
        transactionType: undefined,
        setup
      })
    );
    expect(mock.params).toMatchSnapshot();
  });

  it('fetches transaction charts for a transaction type', async () => {
    mock = await inspectSearchParams(setup =>
      getTransactionCharts({
        serviceName: 'foo',
        transactionName: 'bar',
        transactionType: undefined,
        setup
      })
    );
    expect(mock.params).toMatchSnapshot();
  });

  it('fetches transaction charts for a transaction type and transaction name', async () => {
    mock = await inspectSearchParams(setup =>
      getTransactionCharts({
        serviceName: 'foo',
        transactionName: 'bar',
        transactionType: 'baz',
        setup
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches transaction distribution', async () => {
    mock = await inspectSearchParams(setup =>
      getTransactionDistribution({
        serviceName: 'foo',
        transactionName: 'bar',
        transactionType: 'baz',
        traceId: 'qux',
        transactionId: 'quz',
        setup
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches a transaction', async () => {
    mock = await inspectSearchParams(setup =>
      getTransaction({ transactionId: 'foo', traceId: 'bar', setup })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
