/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  inspectSearchParams,
  SearchParamsMock,
} from '../../../utils/test_helpers';
import { getTransaction } from './get_transaction';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  SERVICE_ENVIRONMENT,
  TRANSACTION_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

describe('custom link get transaction', () => {
  let mock: SearchParamsMock;
  it('fetches without filter', async () => {
    mock = await inspectSearchParams((setup, apmEventClient) =>
      getTransaction({
        apmEventClient: apmEventClient as unknown as APMEventClient,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
  it('fetches with all filter', async () => {
    mock = await inspectSearchParams((setup, apmEventClient) =>
      getTransaction({
        apmEventClient: apmEventClient as unknown as APMEventClient,
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
