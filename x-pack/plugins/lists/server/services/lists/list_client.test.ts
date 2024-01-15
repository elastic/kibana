/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';
import { LIST_INDEX, LIST_ITEM_INDEX } from '../../../common/constants.mock';

import { getListClientMock } from './list_client.mock';

describe('list_client', () => {
  describe('Mock client checks (not exhaustive tests against it)', () => {
    test('it returns the get list index as expected', () => {
      const mock = getListClientMock();
      expect(mock.getListName()).toEqual(LIST_INDEX);
    });

    test('it returns the get list item index as expected', () => {
      const mock = getListClientMock();
      expect(mock.getListItemName()).toEqual(LIST_ITEM_INDEX);
    });

    test('it returns a mock list item', async () => {
      const mock = getListClientMock();
      const listItem = await mock.getListItem({ id: '123' });
      expect(listItem).toEqual(getListItemResponseMock());
    });
  });
});
