/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../utils/test_helpers';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getErrorGroupMainStatistics } from './get_error_groups/get_error_group_main_statistics';
import { getErrorGroupSample } from './get_error_groups/get_error_group_sample';

describe('error queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches a single error group', async () => {
    mock = await inspectSearchParams((setup) =>
      getErrorGroupSample({
        groupId: 'groupId',
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

  it('fetches multiple error groups', async () => {
    mock = await inspectSearchParams((setup) =>
      getErrorGroupMainStatistics({
        sortDirection: 'asc',
        sortField: 'foo',
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

  it('fetches multiple error groups when sortField = lastSeen', async () => {
    mock = await inspectSearchParams((setup) =>
      getErrorGroupMainStatistics({
        sortDirection: 'asc',
        sortField: 'lastSeen',
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
});
