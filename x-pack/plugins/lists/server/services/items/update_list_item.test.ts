/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';

import { updateListItem } from './update_list_item';
import { getListItem } from './get_list_item';
import { getUpdateListItemOptionsMock } from './update_list_item.mock';

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

  test('it returns null when there is not a list item to update', async () => {
    (getListItem as unknown as jest.Mock).mockResolvedValueOnce(null);
    const options = getUpdateListItemOptionsMock();
    const updatedList = await updateListItem(options);
    expect(updatedList).toEqual(null);
  });

  test('it returns null when the serializer and type such as ip_range returns nothing', async () => {
    const listItem: ListItemSchema = {
      ...getListItemResponseMock(),
      serializer: '',
      type: 'ip_range',
      value: '127.0.0.1',
    };
    (getListItem as unknown as jest.Mock).mockResolvedValueOnce(listItem);
    const options = getUpdateListItemOptionsMock();
    const updatedList = await updateListItem(options);
    expect(updatedList).toEqual(null);
  });
});
