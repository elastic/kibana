/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import { createPromiseFromStreams } from '@kbn/utils';

import {
  getImportExceptionsListItemSchemaDecodedMock,
  getImportExceptionsListItemSchemaMock,
  getImportExceptionsListSchemaDecodedMock,
  getImportExceptionsListSchemaMock,
} from '../../../../../common/schemas/request/import_exceptions_schema.mock';
import { PromiseStream } from '../../import_exception_list_and_items';

import { createExceptionsStreamFromNdjson } from './create_exceptions_stream_from_ndjson';

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
      const list = { ...getImportExceptionsListSchemaMock(), id: '123' };

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
