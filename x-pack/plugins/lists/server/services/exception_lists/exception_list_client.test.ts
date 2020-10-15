/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';

import { getExceptionListClientMock } from './exception_list_client.mock';

describe('exception_list_client', () => {
  describe('Mock client sanity checks', () => {
    test('it returns the exception list as expected', async () => {
      const mock = getExceptionListClientMock();
      const list = await mock.getExceptionList({
        id: '123',
        listId: '123',
        namespaceType: 'single',
      });
      expect(list).toEqual(getExceptionListSchemaMock());
    });

    test('it returns the the exception list item as expected', async () => {
      const mock = getExceptionListClientMock();
      const listItem = await mock.getExceptionListItem({
        id: '123',
        itemId: '123',
        namespaceType: 'single',
      });
      expect(listItem).toEqual(getExceptionListItemSchemaMock());
    });
  });
});
