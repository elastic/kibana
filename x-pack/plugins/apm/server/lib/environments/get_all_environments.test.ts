/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllEnvironments } from './get_all_environments';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../utils/test_helpers';

describe('getAllEnvironments', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches all environments', async () => {
    mock = await inspectSearchParams((setup) =>
      getAllEnvironments({
        searchAggregatedTransactions: false,
        serviceName: 'test',
        setup,
        size: 50,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches all environments with includeMissing', async () => {
    mock = await inspectSearchParams((setup) =>
      getAllEnvironments({
        includeMissing: true,
        searchAggregatedTransactions: false,
        serviceName: 'test',
        setup,
        size: 50,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
