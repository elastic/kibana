/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import { createPromiseFromStreams } from '@kbn/utils';

import {
  PromiseStream,
  createRulesStreamFromNdJson,
  getTupleErrorsAndUniqueExceptionListItems,
  getTupleErrorsAndUniqueExceptionLists,
  importExceptionLists,
} from './import_exceptions_utils';
import {
  getImportExceptionsListItemSchemaDecodedMock,
  getImportExceptionsListItemSchemaMock,
  getImportExceptionsListSchemaDecodedMock,
  getImportExceptionsListSchemaMock,
} from '../../../common/schemas/request/import_exception_list_schema.mock';
import { getExceptionListClientMock } from '../../services/exception_lists/exception_list_client.mock';
import { ExceptionListClient } from '../../services/exception_lists/exception_list_client';

describe('import_exceptions_utils', () => {
  describe('createRulesStreamFromNdJson', () => {
    it('filters out empty strings', async () => {
      const ndJsonStream = new Readable({
        read(): void {
          this.push('    ');
          this.push(`${JSON.stringify(getImportExceptionsListSchemaMock())}\n`);
          this.push('');
          this.push(`${JSON.stringify(getImportExceptionsListItemSchemaMock())}\n`);
          this.push(null);
        },
      });
      const result = await createPromiseFromStreams<PromiseStream[]>([
        ndJsonStream,
        ...createRulesStreamFromNdJson(100),
      ]);

      expect(result).toEqual([
        {
          items: [getImportExceptionsListItemSchemaDecodedMock()],
          lists: [getImportExceptionsListSchemaDecodedMock()],
        },
      ]);
    });

    it('filters out count metadata', async () => {
      const ndJsonStream = new Readable({
        read(): void {
          this.push(`${JSON.stringify(getImportExceptionsListSchemaMock())}\n`);
          this.push(
            `${JSON.stringify({
              exported_exception_list_count: 0,
              exported_exception_list_item_count: 0,
              missing_exception_list_item_count: 0,
              missing_exception_list_items: [],
              missing_exception_lists: [],
              missing_exception_lists_count: 0,
            })}\n`
          );
          this.push(`${JSON.stringify(getImportExceptionsListItemSchemaMock())}\n`);
          this.push(null);
        },
      });
      const result = await createPromiseFromStreams<PromiseStream[]>([
        ndJsonStream,
        ...createRulesStreamFromNdJson(100),
      ]);

      expect(result).toEqual([
        {
          items: [getImportExceptionsListItemSchemaDecodedMock()],
          lists: [getImportExceptionsListSchemaDecodedMock()],
        },
      ]);
    });

    it('sorts the items and lists', async () => {
      const ndJsonStream = new Readable({
        read(): void {
          this.push(`${JSON.stringify(getImportExceptionsListItemSchemaMock('2'))}\n`);
          this.push(`${JSON.stringify(getImportExceptionsListSchemaMock())}\n`);
          this.push(`${JSON.stringify(getImportExceptionsListItemSchemaMock('1'))}\n`);
          this.push(null);
        },
      });
      const result = await createPromiseFromStreams<PromiseStream[]>([
        ndJsonStream,
        ...createRulesStreamFromNdJson(100),
      ]);

      expect(result).toEqual([
        {
          items: [
            getImportExceptionsListItemSchemaDecodedMock('2'),
            getImportExceptionsListItemSchemaDecodedMock('1'),
          ],
          lists: [getImportExceptionsListSchemaDecodedMock()],
        },
      ]);
    });

    describe('items validation', () => {
      it('reports when an item is missing "item_id"', async () => {
        const item = getImportExceptionsListItemSchemaMock();
        // @ts-expect-error
        delete item.item_id;

        const ndJsonStream = new Readable({
          read(): void {
            this.push(`${JSON.stringify(item)}\n`);
            this.push(null);
          },
        });
        const result = await createPromiseFromStreams<PromiseStream[]>([
          ndJsonStream,
          ...createRulesStreamFromNdJson(100),
        ]);

        expect(result).toEqual([
          {
            items: [new Error('Invalid value "undefined" supplied to "item_id"')],
            lists: [],
          },
        ]);
      });

      it('reports when an item is missing "entries"', async () => {
        const item = getImportExceptionsListItemSchemaMock();
        // @ts-expect-error
        delete item.entries;

        const ndJsonStream = new Readable({
          read(): void {
            this.push(`${JSON.stringify(item)}\n`);
            this.push(null);
          },
        });
        const result = await createPromiseFromStreams<PromiseStream[]>([
          ndJsonStream,
          ...createRulesStreamFromNdJson(100),
        ]);

        expect(result).toEqual([
          {
            items: [new Error('Invalid value "undefined" supplied to "entries"')],
            lists: [],
          },
        ]);
      });

      it('does not error if item includes an id, is ignored', async () => {
        const item = { ...getImportExceptionsListItemSchemaMock(), id: '123' };

        const ndJsonStream = new Readable({
          read(): void {
            this.push(`${JSON.stringify(item)}\n`);
            this.push(null);
          },
        });
        const result = await createPromiseFromStreams<PromiseStream[]>([
          ndJsonStream,
          ...createRulesStreamFromNdJson(100),
        ]);

        expect(result).toEqual([
          {
            items: [{ ...getImportExceptionsListItemSchemaDecodedMock(), id: '123' }],
            lists: [],
          },
        ]);
      });
    });

    describe('lists validation', () => {
      it('reports when an item is missing "item_id"', async () => {
        const list = getImportExceptionsListSchemaMock();
        // @ts-expect-error
        delete list.list_id;

        const ndJsonStream = new Readable({
          read(): void {
            this.push(`${JSON.stringify(list)}\n`);
            this.push(null);
          },
        });
        const result = await createPromiseFromStreams<PromiseStream[]>([
          ndJsonStream,
          ...createRulesStreamFromNdJson(100),
        ]);

        expect(result).toEqual([
          {
            items: [],
            lists: [new Error('Invalid value "undefined" supplied to "list_id"')],
          },
        ]);
      });

      it('does not error if list includes an id, is ignored', async () => {
        const list = { ...getImportExceptionsListSchemaMock(), id: '123' };

        const ndJsonStream = new Readable({
          read(): void {
            this.push(`${JSON.stringify(list)}\n`);
            this.push(null);
          },
        });
        const result = await createPromiseFromStreams<PromiseStream[]>([
          ndJsonStream,
          ...createRulesStreamFromNdJson(100),
        ]);

        expect(result).toEqual([
          {
            items: [],
            lists: [{ ...getImportExceptionsListSchemaDecodedMock(), id: '123' }],
          },
        ]);
      });
    });
  });

  describe('getTupleErrorsAndUniqueExceptionLists', () => {
    it('reports duplicate list_ids', () => {
      const results = getTupleErrorsAndUniqueExceptionLists([
        getImportExceptionsListSchemaDecodedMock(),
        getImportExceptionsListSchemaDecodedMock(),
      ]);
      expect(results).toEqual([
        [
          {
            error: {
              message:
                'More than one exception list with list_id: "detection_list_id" found in imports',
              status_code: 400,
            },
            list_id: 'detection_list_id',
          },
        ],
        [
          {
            description: 'some description',
            list_id: 'detection_list_id',
            name: 'Query with a rule id',
            type: 'detection',
          },
        ],
      ]);
    });

    it('does not report duplicates if non exist', () => {
      const results = getTupleErrorsAndUniqueExceptionLists([
        getImportExceptionsListSchemaDecodedMock('1'),
        getImportExceptionsListSchemaDecodedMock('2'),
      ]);
      expect(results).toEqual([
        [],
        [
          {
            description: 'some description',
            list_id: '1',
            name: 'Query with a rule id',
            type: 'detection',
          },
          {
            description: 'some description',
            list_id: '2',
            name: 'Query with a rule id',
            type: 'detection',
          },
        ],
      ]);
    });
  });

  describe('getTupleErrorsAndUniqueExceptionListItems', () => {
    it('reports duplicate item_ids', () => {
      const results = getTupleErrorsAndUniqueExceptionListItems([
        getImportExceptionsListItemSchemaDecodedMock(),
        getImportExceptionsListItemSchemaDecodedMock(),
      ]);
      expect(results).toEqual([
        [
          {
            error: {
              message:
                'More than one exception list item with item_id: "item_id_1 found in imports" found',
              status_code: 400,
            },
            item_id: 'item_id_1',
          },
        ],
        [
          {
            description: 'some description',
            entries: [
              {
                entries: [
                  {
                    field: 'nested.field',
                    operator: 'included',
                    type: 'match',
                    value: 'some value',
                  },
                ],
                field: 'some.parentField',
                type: 'nested',
              },
              {
                field: 'some.not.nested.field',
                operator: 'included',
                type: 'match',
                value: 'some value',
              },
            ],
            item_id: 'item_id_1',
            list_id: 'detection_list_id',
            name: 'Query with a rule id',
            type: 'simple',
          },
        ],
      ]);
    });

    it('does not report duplicates if non exist', () => {
      const results = getTupleErrorsAndUniqueExceptionListItems([
        getImportExceptionsListItemSchemaDecodedMock('1'),
        getImportExceptionsListItemSchemaDecodedMock('2'),
      ]);
      expect(results).toEqual([
        [],
        [
          {
            description: 'some description',
            entries: [
              {
                entries: [
                  {
                    field: 'nested.field',
                    operator: 'included',
                    type: 'match',
                    value: 'some value',
                  },
                ],
                field: 'some.parentField',
                type: 'nested',
              },
              {
                field: 'some.not.nested.field',
                operator: 'included',
                type: 'match',
                value: 'some value',
              },
            ],
            item_id: '1',
            list_id: 'detection_list_id',
            name: 'Query with a rule id',
            type: 'simple',
          },
          {
            description: 'some description',
            entries: [
              {
                entries: [
                  {
                    field: 'nested.field',
                    operator: 'included',
                    type: 'match',
                    value: 'some value',
                  },
                ],
                field: 'some.parentField',
                type: 'nested',
              },
              {
                field: 'some.not.nested.field',
                operator: 'included',
                type: 'match',
                value: 'some value',
              },
            ],
            item_id: '2',
            list_id: 'detection_list_id',
            name: 'Query with a rule id',
            type: 'simple',
          },
        ],
      ]);
    });
  });

  describe('importExceptionLists', () => {
    let exceptionListsClient: ExceptionListClient;

    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetAllMocks();

      exceptionListsClient = getExceptionListClientMock();
    });

    test('it reports errors on creation', async () => {
      jest.spyOn(exceptionListsClient, 'getExceptionList').mockResolvedValueOnce(null);

      jest
        .spyOn(exceptionListsClient, 'createExceptionList')
        .mockRejectedValue(() => new Error('error in creation'));
      const result = await importExceptionLists({
        exceptionListsClient,
        isOverwrite: false,
        listsChunks: [[getImportExceptionsListSchemaDecodedMock()]],
      });

      expect(result).toEqual({
        errors: [{ error: { message: undefined, status_code: 400 }, list_id: 'detection_list_id' }],
        success: false,
        success_count: 0,
      });
    });

    test('it reports errors on update', async () => {
      jest
        .spyOn(exceptionListsClient, 'updateExceptionList')
        .mockRejectedValue(() => new Error('error in creation'));
      const result = await importExceptionLists({
        exceptionListsClient,
        isOverwrite: true,
        listsChunks: [[getImportExceptionsListSchemaDecodedMock()]],
      });

      expect(result).toEqual({
        errors: [{ error: { message: undefined, status_code: 400 }, list_id: 'detection_list_id' }],
        success: false,
        success_count: 0,
      });
    });

    test('it reports a conflict back if matching list found and "isOverwrite" is false', async () => {
      const result = await importExceptionLists({
        exceptionListsClient,
        isOverwrite: false,
        listsChunks: [[getImportExceptionsListSchemaDecodedMock()]],
      });

      expect(result).toEqual({
        errors: [
          {
            error: { message: 'list_id: "detection_list_id" already exists', status_code: 409 },
            list_id: 'detection_list_id',
          },
        ],
        success: false,
        success_count: 0,
      });
    });

    test('it creates list if no matching list found', async () => {
      const result = await importExceptionLists({
        exceptionListsClient,
        isOverwrite: true,
        listsChunks: [[getImportExceptionsListSchemaDecodedMock()]],
      });

      expect(result).toEqual({ errors: [], success: true, success_count: 1 });
    });

    test('it overwrites list if matching list found and "isOverwrite" is true', async () => {
      jest.spyOn(exceptionListsClient, 'getExceptionList').mockResolvedValueOnce(null);

      const result = await importExceptionLists({
        exceptionListsClient,
        isOverwrite: true,
        listsChunks: [[getImportExceptionsListSchemaDecodedMock()]],
      });

      expect(result).toEqual({ errors: [], success: true, success_count: 1 });
    });
  });
});
