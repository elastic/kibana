/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';

import { exportExceptionListAndItems } from './export_exception_list_and_items';

describe('export_exception_list_and_items', () => {
  describe('exportExceptionListAndItems', () => {
    test('it should return null if no matching exception list found', async () => {
      const result = await exportExceptionListAndItems({
        findExceptionListItem: jest.fn(),
        getExceptionList: jest.fn().mockResolvedValue(null),
        id: '123',
        listId: 'non-existent',
        namespaceType: 'single',
      });
      expect(result).toBeNull();
    });

    test('it should return stringified list and items', async () => {
      const result = await exportExceptionListAndItems({
        findExceptionListItem: jest
          .fn()
          .mockResolvedValue({ data: [getExceptionListItemSchemaMock()] }),
        getExceptionList: jest.fn().mockResolvedValue(getExceptionListSchemaMock()),
        id: '123',
        listId: 'non-existent',
        namespaceType: 'single',
      });
      expect(result).toEqual(
        `${JSON.stringify(getExceptionListSchemaMock())}\n${JSON.stringify(
          getExceptionListItemSchemaMock()
        )}\n{"exported_exception_list_id":"1","exported_exception_list_items_count":1}\n`
      );
    });
  });
});
