/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getListResponseMock, getUpdateListOptionsMock } from '../mocks';

import { updateList } from './update_list';
import { getList } from './get_list';

jest.mock('./get_list', () => ({
  getList: jest.fn(),
}));

describe('update_list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list as expected with the id changed out for the elastic id when there is a list to update', async () => {
    const list = getListResponseMock();
    ((getList as unknown) as jest.Mock).mockResolvedValueOnce(list);
    const options = getUpdateListOptionsMock();
    const updatedList = await updateList(options);
    const expected = getListResponseMock();
    expected.id = 'elastic-id-123';
    expect(updatedList).toEqual(expected);
  });

  test('it returns null when there is not a list to update', async () => {
    ((getList as unknown) as jest.Mock).mockResolvedValueOnce(null);
    const options = getUpdateListOptionsMock();
    const updatedList = await updateList(options);
    expect(updatedList).toEqual(null);
  });
});
