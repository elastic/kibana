/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';

import {
  LinesResult,
  importListItemsToStream,
  writeBufferToItems,
} from './write_lines_to_bulk_list_items';
import {
  getImportListItemsToStreamOptionsMock,
  getWriteBufferToItemsOptionsMock,
} from './write_lines_to_bulk_list_items.mock';

import { createListItemsBulk } from '.';

jest.mock('./create_list_items_bulk', () => ({
  createListItemsBulk: jest.fn(),
}));

describe('write_lines_to_bulk_list_items', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('importListItemsToStream', () => {
    test('It imports a set of items to a write buffer by calling "getListItemByValues" with an empty buffer', async () => {
      const options = getImportListItemsToStreamOptionsMock();
      const promise = importListItemsToStream(options);
      options.stream.push(null);
      await promise;
      expect(createListItemsBulk).toBeCalledWith(expect.objectContaining({ value: [] }));
    });

    test('It imports a set of items to a write buffer by calling "getListItemByValues" with a single value given', async () => {
      const options = getImportListItemsToStreamOptionsMock();
      const promise = importListItemsToStream(options);
      options.stream.push('127.0.0.1\n');
      options.stream.push(null);
      await promise;
      expect(createListItemsBulk).toBeCalledWith(expect.objectContaining({ value: ['127.0.0.1'] }));
    });

    test('It imports a set of items to a write buffer by calling "getListItemByValues" with two values given', async () => {
      const options = getImportListItemsToStreamOptionsMock();
      const promise = importListItemsToStream(options);
      options.stream.push('127.0.0.1\n');
      options.stream.push('127.0.0.2\n');
      options.stream.push(null);
      await promise;
      expect(createListItemsBulk).toBeCalledWith(
        expect.objectContaining({ value: ['127.0.0.1', '127.0.0.2'] })
      );
    });
  });

  describe('writeBufferToItems', () => {
    test('It returns no duplicates and no lines processed when given empty items', async () => {
      const options = getWriteBufferToItemsOptionsMock();
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        linesProcessed: 0,
      };
      expect(linesResult).toEqual(expected);
    });

    test('It returns no lines processed when given items but no buffer', async () => {
      const options = getWriteBufferToItemsOptionsMock();
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        linesProcessed: 0,
      };
      expect(linesResult).toEqual(expected);
    });

    test('It returns 1 lines processed when given a buffer item that is not a duplicate', async () => {
      const options = getWriteBufferToItemsOptionsMock();
      options.buffer = ['255.255.255.255'];
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        linesProcessed: 1,
      };
      expect(linesResult).toEqual(expected);
    });

    test('It does not filter duplicate values out', async () => {
      const data = getListItemResponseMock();
      const options = getWriteBufferToItemsOptionsMock();
      options.buffer = [data.value];
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        linesProcessed: 1,
      };
      expect(linesResult).toEqual(expected);
    });

    test('It does not filter a duplicate value out and processes a second value normally', async () => {
      const data = getListItemResponseMock();
      const options = getWriteBufferToItemsOptionsMock();
      options.buffer = ['255.255.255.255', data.value];
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        linesProcessed: 2,
      };
      expect(linesResult).toEqual(expected);
    });

    test('It does not filter a duplicate value out and reports it as a duplicate and processes two other values', async () => {
      const data = getListItemResponseMock();
      const options = getWriteBufferToItemsOptionsMock();
      options.buffer = ['255.255.255.255', '192.168.0.1', data.value];
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        linesProcessed: 3,
      };
      expect(linesResult).toEqual(expected);
    });

    test('It does not filter two duplicate values out and reports the values normally', async () => {
      const dataItem1 = getListItemResponseMock();
      dataItem1.value = '127.0.0.1';
      const dataItem2 = getListItemResponseMock();
      dataItem2.value = '127.0.0.2';
      const options = getWriteBufferToItemsOptionsMock();
      options.buffer = [dataItem1.value, dataItem2.value, '192.168.0.0.1'];
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        linesProcessed: 3,
      };
      expect(linesResult).toEqual(expected);
    });
  });
});
