/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LIST_ID,
  LIST_INDEX,
  getCreateListOptionsMock,
  getIndexESListMock,
  getListResponseMock,
} from '../mocks';

import { createList } from './create_list';

describe('crete_list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list as expected with the id changed out for the elastic id', async () => {
    const options = getCreateListOptionsMock();
    const list = await createList(options);
    const expected = getListResponseMock();
    expected.id = 'elastic-id-123';
    expect(list).toEqual(expected);
  });

  test('It calls "callCluster" with body, index, and listIndex', async () => {
    const options = getCreateListOptionsMock();
    await createList(options);
    const body = getIndexESListMock();
    const expected = {
      body,
      id: LIST_ID,
      index: LIST_INDEX,
    };
    expect(options.callCluster).toBeCalledWith('index', expected);
  });

  test('It returns an auto-generated id if id is sent in undefined', async () => {
    const options = getCreateListOptionsMock();
    options.id = undefined;
    const list = await createList(options);
    const expected = getListResponseMock();
    expected.id = 'elastic-id-123';
    expect(list).toEqual(expected);
  });
});
