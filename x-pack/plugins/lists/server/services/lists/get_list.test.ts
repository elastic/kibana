/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LIST_ID,
  LIST_INDEX,
  getCallClusterMock,
  getListResponseMock,
  getSearchListMock,
} from '../mocks';

import { getList } from './get_list';

describe('get_list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list as expected if the list is found', async () => {
    const data = getSearchListMock();
    const callCluster = getCallClusterMock(data);
    const list = await getList({ callCluster, id: LIST_ID, listIndex: LIST_INDEX });
    const expected = getListResponseMock();
    expect(list).toEqual(expected);
  });

  test('it returns null if the search is empty', async () => {
    const data = getSearchListMock();
    data.hits.hits = [];
    const callCluster = getCallClusterMock(data);
    const list = await getList({ callCluster, id: LIST_ID, listIndex: LIST_INDEX });
    expect(list).toEqual(null);
  });
});
