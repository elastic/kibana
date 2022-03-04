/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEnvironments } from './get_environments';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../utils/test_helpers';

describe('getEnvironments', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches environments', async () => {
    mock = await inspectSearchParams((setup) =>
      getEnvironments({
        setup,
        serviceName: 'foo',
        searchAggregatedTransactions: false,
        size: 50,
        start: 0,
        end: 50000,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches environments without a service name', async () => {
    mock = await inspectSearchParams((setup) =>
      getEnvironments({
        setup,
        searchAggregatedTransactions: false,
        size: 50,
        start: 0,
        end: 50000,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
