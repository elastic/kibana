/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inspectSearchParams, SearchParamsMock } from '../../../utils/test_helpers';
import { getTransaction } from './get_transaction';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  SERVICE_ENVIRONMENT,
  TRANSACTION_NAME,
} from '../../../../common/es_fields/apm';

describe('custom link get transaction', () => {
  let mock: SearchParamsMock;
  it('fetches without filter', async () => {
    mock = await inspectSearchParams(({ mockApmEventClient }) =>
      getTransaction({
        apmEventClient: mockApmEventClient,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
  it('fetches with all filter', async () => {
    mock = await inspectSearchParams(({ mockApmEventClient }) =>
      getTransaction({
        apmEventClient: mockApmEventClient,
        filters: {
          [SERVICE_NAME]: 'foo',
          [SERVICE_ENVIRONMENT]: 'bar',
          [TRANSACTION_NAME]: 'baz',
          [TRANSACTION_TYPE]: 'qux',
        },
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
