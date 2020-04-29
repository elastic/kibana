/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServerMock } from 'src/core/server/mocks';
import { KibanaRequest } from 'src/core/server';

import { getSpace } from '../utils';

import { getListIndex } from './get_list_index';

jest.mock('../utils', () => ({
  getSpace: jest.fn(),
}));

describe('get_list_index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Returns the list index when there is a space', async () => {
    ((getSpace as unknown) as jest.Mock).mockReturnValueOnce('test-space');
    const rawRequest = httpServerMock.createRawRequest({});
    const request = KibanaRequest.from(rawRequest);
    const listIndex = getListIndex({
      listsIndexName: 'lists-index',
      request,
      spaces: undefined,
    });
    expect(listIndex).toEqual('lists-index-test-space');
  });
});
