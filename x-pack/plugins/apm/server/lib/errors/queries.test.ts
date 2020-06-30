/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getErrorGroup } from './get_error_group';
import { getErrorGroups } from './get_error_groups';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../../public/utils/testHelpers';

describe('error queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches a single error group', async () => {
    mock = await inspectSearchParams((setup) =>
      getErrorGroup({
        groupId: 'groupId',
        serviceName: 'serviceName',
        setup,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches multiple error groups', async () => {
    mock = await inspectSearchParams((setup) =>
      getErrorGroups({
        sortDirection: 'asc',
        sortField: 'foo',
        serviceName: 'serviceName',
        setup,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches multiple error groups when sortField = latestOccurrenceAt', async () => {
    mock = await inspectSearchParams((setup) =>
      getErrorGroups({
        sortDirection: 'asc',
        sortField: 'latestOccurrenceAt',
        serviceName: 'serviceName',
        setup,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
