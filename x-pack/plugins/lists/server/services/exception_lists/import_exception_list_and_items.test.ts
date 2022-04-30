/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import { SavedObjectsClientContract } from 'kibana/server';

import {
  getImportExceptionsListItemSchemaMock,
  getImportExceptionsListSchemaMock,
} from '../../../../lists/common/schemas/request/import_exceptions_schema.mock';

import { importExceptionsAsStream } from './import_exception_list_and_items';
import { importExceptionLists } from './utils/import/import_exception_lists';
import { importExceptionListItems } from './utils/import/import_exception_list_items';

jest.mock('./utils/import/import_exception_lists');
jest.mock('./utils/import/import_exception_list_items');

const toReadable = (items: unknown[]): Readable => {
  const stringOfExceptions = items.map((item) => JSON.stringify(item));

  return new Readable({
    read(): void {
      this.push(stringOfExceptions.join('\n'));
      this.push(null);
    },
  });
};

describe('import_exception_list_and_items', () => {
  beforeEach(() => {
    (importExceptionLists as jest.Mock).mockResolvedValue({
      errors: [],
      success: true,
      success_count: 1,
    });
    (importExceptionListItems as jest.Mock).mockResolvedValue({
      errors: [],
      success: true,
      success_count: 1,
    });
  });

  test('it should report success false if an error occurred importing lists', async () => {
    (importExceptionLists as jest.Mock).mockResolvedValue({
      errors: [{ error: { message: 'some error occurred', status_code: 400 } }],
      success: false,
      success_count: 1,
    });

    const result = await importExceptionsAsStream({
      exceptionsToImport: toReadable([
        getImportExceptionsListSchemaMock('test_list_id'),
        getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
      ]),
      maxExceptionsImportSize: 10000,
      overwrite: false,
      savedObjectsClient: {} as SavedObjectsClientContract,
      user: 'elastic',
    });
    expect(result).toEqual({
      errors: [{ error: { message: 'some error occurred', status_code: 400 } }],
      success: false,
      success_count: 2,
      success_count_exception_list_items: 1,
      success_count_exception_lists: 1,
      success_exception_list_items: true,
      success_exception_lists: false,
    });
  });

  test('it should report success false if an error occurred importing items', async () => {
    (importExceptionListItems as jest.Mock).mockResolvedValue({
      errors: [{ error: { message: 'some error occurred', status_code: 400 } }],
      success: false,
      success_count: 1,
    });

    const result = await importExceptionsAsStream({
      exceptionsToImport: toReadable([
        getImportExceptionsListSchemaMock('test_list_id'),
        getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
      ]),
      maxExceptionsImportSize: 10000,
      overwrite: false,
      savedObjectsClient: {} as SavedObjectsClientContract,
      user: 'elastic',
    });
    expect(result).toEqual({
      errors: [{ error: { message: 'some error occurred', status_code: 400 } }],
      success: false,
      success_count: 2,
      success_count_exception_list_items: 1,
      success_count_exception_lists: 1,
      success_exception_list_items: false,
      success_exception_lists: true,
    });
  });

  test('it should report success true if no errors occurred importing lists and items', async () => {
    const result = await importExceptionsAsStream({
      exceptionsToImport: toReadable([
        getImportExceptionsListSchemaMock('test_list_id'),
        getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
      ]),
      maxExceptionsImportSize: 10000,
      overwrite: false,
      savedObjectsClient: {} as SavedObjectsClientContract,
      user: 'elastic',
    });
    expect(result).toEqual({
      errors: [],
      success: true,
      success_count: 2,
      success_count_exception_list_items: 1,
      success_count_exception_lists: 1,
      success_exception_list_items: true,
      success_exception_lists: true,
    });
  });
});
