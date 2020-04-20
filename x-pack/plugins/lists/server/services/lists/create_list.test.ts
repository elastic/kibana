/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createList } from './create_list';

describe('crete_list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It returns a list', async () => {
    const id = '123';
    const name = 'some-name';
    const type = 'ip';
    const description = 'some-description';
    const dataClient = {
      callAsCurrentUser: (): Promise<unknown> =>
        Promise.resolve({ _id: '123', _shards: { total: 1 } }),
      callAsInternalUser: (): Promise<never> => {
        throw new Error('This function should not be calling "callAsInternalUser"');
      },
    };
    const listsIndex = 'some index';
    const user = 'some user';
    const meta = undefined;
    const dateNow = '2020-04-20T15:25:31.830Z';
    const tieBreaker = '6a76b69d-80df-4ab2-8c3e-85f466b06a0e';
    const list = await createList({
      dataClient,
      dateNow,
      description,
      id,
      listsIndex,
      meta,
      name,
      tieBreaker,
      type,
      user,
    });

    expect(list).toEqual({
      created_at: dateNow,
      created_by: user,
      description,
      id,
      meta,
      name,
      tie_breaker_id: tieBreaker,
      type,
      updated_at: dateNow,
      updated_by: user,
    });
  });
});
