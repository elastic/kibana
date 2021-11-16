/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';

import { exportExceptionListAndItems } from './export_exception_list_and_items';
import { findExceptionListItem } from './find_exception_list_item';
import { getExceptionList } from './get_exception_list';

jest.mock('./get_exception_list');
jest.mock('./find_exception_list_item');

describe('export_exception_list_and_items', () => {
  describe('exportExceptionListAndItems', () => {
    test('it should return null if no matching exception list found', async () => {
      (getExceptionList as jest.Mock).mockResolvedValue(null);
      (findExceptionListItem as jest.Mock).mockResolvedValue({ data: [] });

      const result = await exportExceptionListAndItems({
        id: '123',
        listId: 'non-existent',
        namespaceType: 'single',
        savedObjectsClient: {} as SavedObjectsClientContract,
      });
      expect(result).toBeNull();
    });

    test('it should return stringified list and items', async () => {
      (getExceptionList as jest.Mock).mockResolvedValue(getExceptionListSchemaMock());
      (findExceptionListItem as jest.Mock).mockResolvedValue({
        data: [getExceptionListItemSchemaMock()],
      });

      const result = await exportExceptionListAndItems({
        id: '123',
        listId: 'non-existent',
        namespaceType: 'single',
        savedObjectsClient: {} as SavedObjectsClientContract,
      });
      expect(result?.exportData).toEqual(
        `${JSON.stringify(getExceptionListSchemaMock())}\n${JSON.stringify(
          getExceptionListItemSchemaMock()
        )}\n`
      );
      expect(result?.exportDetails).toEqual({
        exported_exception_list_count: 1,
        exported_exception_list_item_count: 1,
        missing_exception_list_item_count: 0,
        missing_exception_list_items: [],
        missing_exception_lists: [],
        missing_exception_lists_count: 0,
      });
    });
  });
});
