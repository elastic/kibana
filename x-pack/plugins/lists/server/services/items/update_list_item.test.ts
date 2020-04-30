/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getListItemResponseMock, getUpdateListItemOptionsMock } from '../mocks';

import { updateListItem } from './update_list_item';
import { getListItem } from './get_list_item';

jest.mock('./get_list_item', () => ({
  getListItem: jest.fn(),
}));

describe('update_list_item', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list item as expected with the id changed out for the elastic id when there is a list item to update', async () => {
    const list = getListItemResponseMock();
    ((getListItem as unknown) as jest.Mock).mockResolvedValueOnce(list);
    const options = getUpdateListItemOptionsMock();
    const updatedList = await updateListItem(options);
    const expected = getListItemResponseMock();
    expected.id = 'elastic-id-123';
    expect(updatedList).toEqual(expected);
  });

  test('it returns null when there is not a list item to update', async () => {
    ((getListItem as unknown) as jest.Mock).mockResolvedValueOnce(null);
    const options = getUpdateListItemOptionsMock();
    const updatedList = await updateListItem(options);
    expect(updatedList).toEqual(null);
  });
});
