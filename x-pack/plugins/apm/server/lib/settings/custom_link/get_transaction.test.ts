/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  inspectSearchParams,
  SearchParamsMock,
} from '../../../../public/utils/testHelpers';
import { getTransaction } from './get_transaction';
import { Setup } from '../../helpers/setup_request';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  SERVICE_ENVIRONMENT,
  TRANSACTION_NAME,
} from '../../../../common/elasticsearch_fieldnames';

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
