/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorDistribution } from './get_distribution';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../../utils/test_helpers';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

describe('error distribution queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches an error distribution', async () => {
    mock = await inspectSearchParams((setup) =>
      getErrorDistribution({
        serviceName: 'serviceName',
        setup,
        environment: ENVIRONMENT_ALL.value,
        kuery: '',
        start: 0,
        end: 50000,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches an error distribution with a group id', async () => {
    mock = await inspectSearchParams((setup) =>
      getErrorDistribution({
        serviceName: 'serviceName',
        groupId: 'foo',
        setup,
        environment: ENVIRONMENT_ALL.value,
        kuery: '',
        start: 0,
        end: 50000,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
