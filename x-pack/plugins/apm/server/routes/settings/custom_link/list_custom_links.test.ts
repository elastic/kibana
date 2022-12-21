/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listCustomLinks } from './list_custom_links';
import {
  inspectSearchParams,
  SearchParamsMock,
} from '../../../utils/test_helpers';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
} from '../../../../common/es_fields/apm';

describe('List Custom Links', () => {
  let mock: SearchParamsMock;

  it('fetches all custom links', async () => {
    mock = await inspectSearchParams(({ mockInternalESClient }) =>
      listCustomLinks({ internalESClient: mockInternalESClient })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('filters custom links', async () => {
    const filters = {
      [SERVICE_NAME]: 'foo',
      [TRANSACTION_NAME]: 'bar',
    };
    mock = await inspectSearchParams(({ mockInternalESClient }) =>
      listCustomLinks({
        filters,
        internalESClient: mockInternalESClient,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
