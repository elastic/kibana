/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import type { SearchParamsMock } from '../../../utils/test_helpers';
import { inspectSearchParams } from '../../../utils/test_helpers';
import type { Setup } from '../../helpers/setup_request';
import { getTransaction } from './get_transaction';

describe('custom link get transaction', () => {
  let mock: SearchParamsMock;
  it('fetches without filter', async () => {
    mock = await inspectSearchParams((setup) =>
      getTransaction({
        setup: (setup as unknown) as Setup,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
  it('fetches with all filter', async () => {
    mock = await inspectSearchParams((setup) =>
      getTransaction({
        setup: (setup as unknown) as Setup,
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
