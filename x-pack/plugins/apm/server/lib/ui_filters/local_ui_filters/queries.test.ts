/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getLocalUIFilters } from './';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../../utils/test_helpers';
import { getServicesProjection } from '../../../projections/services';

describe('local ui filter queries', () => {
  let mock: SearchParamsMock;

  beforeEach(() => {
    jest.mock('../../helpers/convert_ui_filters/get_es_filter', () => {
      return [];
    });
  });

  afterEach(() => {
    mock.teardown();
  });

  it('fetches local ui filter aggregations', async () => {
    mock = await inspectSearchParams((setup) =>
      getLocalUIFilters({
        setup,
        localFilterNames: ['transactionResult', 'host'],
        projection: getServicesProjection({
          setup,
          searchAggregatedTransactions: false,
        }),
        uiFilters: {
          transactionResult: ['2xx'],
        },
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
