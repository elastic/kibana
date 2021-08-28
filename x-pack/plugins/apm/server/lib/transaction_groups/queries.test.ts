/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import type { SearchParamsMock } from '../../utils/test_helpers';
import { inspectSearchParams } from '../../utils/test_helpers';
import { topTransactionGroupsFetcher } from './fetcher';

describe('transaction group queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches top traces', async () => {
    mock = await inspectSearchParams((setup) =>
      topTransactionGroupsFetcher(
        {
          searchAggregatedTransactions: false,
          environment: ENVIRONMENT_ALL.value,
          kuery: '',
        },
        setup
      )
    );

    const allParams = mock.spy.mock.calls.map((call) => call[1]);

    expect(allParams).toMatchSnapshot();
  });
  it('fetches metrics top traces', async () => {
    mock = await inspectSearchParams((setup) =>
      topTransactionGroupsFetcher(
        {
          searchAggregatedTransactions: true,
          environment: ENVIRONMENT_ALL.value,
          kuery: '',
        },
        setup
      )
    );

    const allParams = mock.spy.mock.calls.map((call) => call[1]);

    expect(allParams).toMatchSnapshot();
  });
});
