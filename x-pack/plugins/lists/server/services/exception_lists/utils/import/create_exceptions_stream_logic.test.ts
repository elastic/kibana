/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import { createPromiseFromStreams } from '@kbn/utils';
import {
  ImportExceptionListItemSchema,
  ImportExceptionsListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import {
  getImportExceptionsListItemSchemaDecodedMock,
  getImportExceptionsListItemSchemaMock,
  getImportExceptionsListSchemaDecodedMock,
  getImportExceptionsListSchemaMock,
} from '../../../../../common/schemas/request/import_exceptions_schema.mock';
import { PromiseStream } from '../../import_exception_list_and_items';

import {
  createExceptionsStreamFromNdjson,
  exceptionsChecksFromArray,
  manageExceptionComments,
} from './create_exceptions_stream_logic';

describe('create_exceptions_stream_logic', () => {
  describe('exceptionsChecksFromArray', () => {
    it('sorts the items and lists', () => {
      const result = exceptionsChecksFromArray(
        [
          getImportExceptionsListItemSchemaMock('2'),
          getImportExceptionsListSchemaMock(),
          getImportExceptionsListItemSchemaMock('1'),
        ],
        100
      );

      expect(result).toEqual({
        items: [
          getImportExceptionsListItemSchemaDecodedMock('2'),
          getImportExceptionsListItemSchemaDecodedMock('1'),
        ],
        lists: [getImportExceptionsListSchemaDecodedMock()],
      });
    });

    it('reports if trying to import more than max allowed number', () => {
      expect(() =>
        exceptionsChecksFromArray(
          [
            getImportExceptionsListItemSchemaMock('2'),
            getImportExceptionsListSchemaMock(),
            getImportExceptionsListItemSchemaMock('1'),
          ],
          1
        )
      ).toThrowErrorMatchingInlineSnapshot(`"Can't import more than 1 exceptions"`);
    });

    describe('items validation', () => {
      it('reports when an item is missing "item_id"', () => {
        const item: Partial<ReturnType<typeof getImportExceptionsListItemSchemaMock>> =
          getImportExceptionsListItemSchemaMock();
        delete item.item_id;

        // Typescript won, and couldn't get it to accept
        // a new value (undefined) for item_id
        const result = exceptionsChecksFromArray([item as ImportExceptionListItemSchema], 100);

        expect(result).toEqual({
          items: [new Error('Invalid value "undefined" supplied to "item_id"')],
          lists: [],
        });
      });

      it('reports when an item is missing "entries"', () => {
        const item: Partial<ReturnType<typeof getImportExceptionsListItemSchemaMock>> =
          getImportExceptionsListItemSchemaMock();
        delete item.entries;

        // Typescript won, and couldn't get it to accept
        // a new value (undefined) for entries
        const result = exceptionsChecksFromArray([item as ImportExceptionListItemSchema], 100);

        expect(result).toEqual({
          items: [new Error('Invalid value "undefined" supplied to "entries"')],
          lists: [],
        });
      });

      it('does not error if item includes an id, is ignored', () => {
        const item: ImportExceptionListItemSchema = {
          ...getImportExceptionsListItemSchemaMock(),
          id: '123',
        };

        const result = exceptionsChecksFromArray([item], 100);

        expect(result).toEqual({
          items: [{ ...getImportExceptionsListItemSchemaDecodedMock(), id: '123' }],
          lists: [],
        });
      });
    });

    describe('lists validation', () => {
      it('reports when an item is missing "item_id"', () => {
        const list: Partial<ReturnType<typeof getImportExceptionsListSchemaMock>> =
          getImportExceptionsListSchemaMock();
        delete list.list_id;

        // Typescript won, and couldn't get it to accept
        // a new value (undefined) for list_id
        const result = exceptionsChecksFromArray([list as ImportExceptionsListSchema], 100);

        expect(result).toEqual({
          items: [],
          lists: [new Error('Invalid value "undefined" supplied to "list_id"')],
        });
      });

      it('does not error if list includes an id, is ignored', () => {
        const list = { ...getImportExceptionsListSchemaMock(), id: '123' };

        const result = exceptionsChecksFromArray([list], 100);

        expect(result).toEqual({
          items: [],
          lists: [{ ...getImportExceptionsListSchemaDecodedMock(), id: '123' }],
        });
      });
    });
  });

  describe('createExceptionsStreamFromNdjson', () => {
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
        ...createExceptionsStreamFromNdjson(100),
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
        ...createExceptionsStreamFromNdjson(100),
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
        ...createExceptionsStreamFromNdjson(100),
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
        const item: Partial<ReturnType<typeof getImportExceptionsListItemSchemaMock>> =
          getImportExceptionsListItemSchemaMock();
        delete item.item_id;

        const ndJsonStream = new Readable({
          read(): void {
            this.push(`${JSON.stringify(item)}\n`);
            this.push(null);
          },
        });
        const result = await createPromiseFromStreams<PromiseStream[]>([
          ndJsonStream,
          ...createExceptionsStreamFromNdjson(100),
        ]);

        expect(result).toEqual([
          {
            items: [new Error('Invalid value "undefined" supplied to "item_id"')],
            lists: [],
          },
        ]);
      });

      it('reports when an item is missing "entries"', async () => {
        const item: Partial<ReturnType<typeof getImportExceptionsListItemSchemaMock>> =
          getImportExceptionsListItemSchemaMock();
        delete item.entries;

        const ndJsonStream = new Readable({
          read(): void {
            this.push(`${JSON.stringify(item)}\n`);
            this.push(null);
          },
        });
        const result = await createPromiseFromStreams<PromiseStream[]>([
          ndJsonStream,
          ...createExceptionsStreamFromNdjson(100),
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
          ...createExceptionsStreamFromNdjson(100),
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
        const list: Partial<ReturnType<typeof getImportExceptionsListSchemaMock>> =
          getImportExceptionsListSchemaMock();
        delete list.list_id;

        const ndJsonStream = new Readable({
          read(): void {
            this.push(`${JSON.stringify(list)}\n`);
            this.push(null);
          },
        });
        const result = await createPromiseFromStreams<PromiseStream[]>([
          ndJsonStream,
          ...createExceptionsStreamFromNdjson(100),
        ]);

        expect(result).toEqual([
          {
            items: [],
            lists: [new Error('Invalid value "undefined" supplied to "list_id"')],
          },
        ]);
      });

      it('does not error if list includes an id, is ignored', async () => {
        const list: ImportExceptionsListSchema = {
          ...getImportExceptionsListSchemaMock(),
          id: '123',
        };

        const ndJsonStream = new Readable({
          read(): void {
            this.push(`${JSON.stringify(list)}\n`);
            this.push(null);
          },
        });
        const result = await createPromiseFromStreams<PromiseStream[]>([
          ndJsonStream,
          ...createExceptionsStreamFromNdjson(100),
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

  describe('manageExceptionComments', () => {
    test('returns empty array if passed in "comments" undefined', () => {
      const result = manageExceptionComments(undefined);
      expect(result).toEqual([]);
    });

    test('returns empty array if passed in "comments" empty array', () => {
      const result = manageExceptionComments([]);
      expect(result).toEqual([]);
    });

    test('returns formatted existing comment', () => {
      const result = manageExceptionComments([
        {
          comment: 'some old comment',
          created_at: '2020-04-20T15:25:31.830Z',
          created_by: 'kibana',
          id: 'uuid_here',
          updated_at: '2020-05-20T15:25:31.830Z',
          updated_by: 'lily',
        },
      ]);

      expect(result).toEqual([
        {
          comment: 'some old comment',
        },
      ]);
    });

    test('returns formatted new comment', () => {
      const result = manageExceptionComments([
        {
          comment: 'some new comment',
        },
      ]);

      expect(result).toEqual([
        {
          comment: 'some new comment',
        },
      ]);
    });
  });
});
