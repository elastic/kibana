/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListSchema } from '../../../common/schemas';
import { getListResponseMock } from '../../../common/schemas/response/list_schema.mock';
import { getIndexESListMock } from '../../../common/schemas/elastic_query/index_es_list_schema.mock';
import { LIST_ID, LIST_INDEX } from '../../../common/constants.mock';

import { CreateListOptions, createList } from './create_list';
import { getCreateListOptionsMock } from './create_list.mock';

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
    const expected: ListSchema = { ...getListResponseMock(), id: 'elastic-id-123' };
    expect(list).toEqual(expected);
  });

  test('it returns a list as expected with the id changed out for the elastic id and seralizer and deseralizer set', async () => {
    const options: CreateListOptions = {
      ...getCreateListOptionsMock(),
      deserializer: '{{value}}',
      serializer: '(?<value>)',
    };
    const list = await createList(options);
    const expected: ListSchema = {
      ...getListResponseMock(),
      deserializer: '{{value}}',
      id: 'elastic-id-123',
      serializer: '(?<value>)',
    };
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
      refresh: 'wait_for',
    };
    expect(options.callCluster).toBeCalledWith('index', expected);
  });

  test('It returns an auto-generated id if id is sent in undefined', async () => {
    const options = getCreateListOptionsMock();
    options.id = undefined;
    const list = await createList(options);
    const expected: ListSchema = { ...getListResponseMock(), id: 'elastic-id-123' };
    expect(list).toEqual(expected);
  });
});
