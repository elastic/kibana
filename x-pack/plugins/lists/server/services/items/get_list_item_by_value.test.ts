/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';

import { getListItemByValues } from './get_list_item_by_values';
import { getListItemByValue } from './get_list_item_by_value';
import { getListItemByValueOptionsMocks } from './get_list_item_by_value.mock';

jest.mock('./get_list_item_by_values', () => ({
  getListItemByValues: jest.fn(),
}));

describe('get_list_by_value', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Calls get_list_item_by_values with its input', async () => {
    const listItemMock = getListItemResponseMock();
    ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce([listItemMock]);
    const options = getListItemByValueOptionsMocks();
    const listItem = await getListItemByValue(options);
    const expected = getListItemResponseMock();
    expect(listItem).toEqual([expected]);
  });
});
