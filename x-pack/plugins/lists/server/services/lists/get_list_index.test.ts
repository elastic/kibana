/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getListIndex } from './get_list_index';

describe('get_list_index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Returns the list index when there is a space', async () => {
    const listIndex = getListIndex({
      listsIndexName: 'lists-index',
      spaceId: 'test-space',
    });
    expect(listIndex).toEqual('lists-index-test-space');
  });
});
