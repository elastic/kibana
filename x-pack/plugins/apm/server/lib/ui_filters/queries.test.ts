/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEnvironments } from './get_environments';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../utils/test_helpers';

describe('ui filter queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches environments', async () => {
    mock = await inspectSearchParams((setup) => getEnvironments(setup, 'foo'));

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches environments without a service name', async () => {
    mock = await inspectSearchParams((setup) => getEnvironments(setup));

    expect(mock.params).toMatchSnapshot();
  });
});
