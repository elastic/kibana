/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
        serviceName: 'test',
        setup,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches all environments with includeMissing', async () => {
    mock = await inspectSearchParams((setup) =>
      getAllEnvironments({
        serviceName: 'test',
        setup,
        includeMissing: true,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
