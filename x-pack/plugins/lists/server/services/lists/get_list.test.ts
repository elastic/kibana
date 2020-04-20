/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListsSchema } from '../../../common/schemas';
import { getDataClientMock, getListResponseMock, getSearchListMock } from '../mocks';

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
    const dataClient = getDataClientMock(data);
    const list = await getList({ dataClient, id: '123', listsIndex: '.lists' });
    const expected: ListsSchema = getListResponseMock();
    expect(list).toEqual(expected);
  });

  test('it returns null if the search is empty', async () => {
    const data = getSearchListMock();
    data.hits.hits = [];
    const dataClient = getDataClientMock(data);
    const list = await getList({ dataClient, id: '123', listsIndex: '.lists' });
    expect(list).toEqual(null);
  });
});
