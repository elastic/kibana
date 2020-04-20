/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexEsListsSchema, ListsSchema } from '../../../common/schemas';
import { getListInputMock } from '../__mocks__/get_list_input_mock';

import { CreateListOptions, createList } from './create_list';

describe('crete_list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It returns a list as expected', async () => {
    const options = getListInputMock();
    const list = await createList(options);
    const { dateNow, user, description, meta, name, tieBreaker, type } = options as Required<
      CreateListOptions
    >;
    const expected: ListsSchema = {
      created_at: dateNow,
      created_by: user,
      description,
      id: 'elastic-id-123',
      meta,
      name,
      tie_breaker_id: tieBreaker,
      type,
      updated_at: dateNow,
      updated_by: user,
    };
    expect(list).toEqual(expected);
  });

  test('It calls "callAsCurrentUser" with body, index, and listsIndex', async () => {
    const options = getListInputMock();
    await createList(options);
    const {
      id,
      dateNow,
      user,
      description,
      meta,
      name,
      tieBreaker,
      type,
      dataClient,
      listsIndex,
    } = options as Required<CreateListOptions>;
    const body: IndexEsListsSchema = {
      created_at: dateNow,
      created_by: user,
      description,
      meta,
      name,
      tie_breaker_id: tieBreaker,
      type,
      updated_at: dateNow,
      updated_by: user,
    };
    const expected = {
      body,
      id,
      index: listsIndex,
    };
    expect(dataClient.callAsCurrentUser).toBeCalledWith('index', expected);
  });

  test('It returns an auto-generated id if id is sent in undefined', async () => {
    const options = getListInputMock();
    options.id = undefined;
    const list = await createList(options);
    const { dateNow, user, description, meta, name, tieBreaker, type } = options as Required<
      CreateListOptions
    >;
    const expected: ListsSchema = {
      created_at: dateNow,
      created_by: user,
      description,
      id: 'elastic-id-123',
      meta,
      name,
      tie_breaker_id: tieBreaker,
      type,
      updated_at: dateNow,
      updated_by: user,
    };
    expect(list).toEqual(expected);
  });
});
