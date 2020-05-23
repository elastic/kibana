/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getImportListItemsToStreamOptionsMock,
  getListItemResponseMock,
  getWriteBufferToItemsOptionsMock,
} from '../mocks';

import {
  LinesResult,
  importListItemsToStream,
  writeBufferToItems,
} from './write_lines_to_bulk_list_items';

import { getListItemByValues } from '.';

jest.mock('./get_list_item_by_values', () => ({
  getListItemByValues: jest.fn(),
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
      ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce([]);
      const options = getImportListItemsToStreamOptionsMock();
      const promise = importListItemsToStream(options);
      options.stream.push(null);
      await promise;
      expect(getListItemByValues).toBeCalledWith(expect.objectContaining({ value: [] }));
    });

    test('It imports a set of items to a write buffer by calling "getListItemByValues" with a single value given', async () => {
      ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce([]);
      const options = getImportListItemsToStreamOptionsMock();
      const promise = importListItemsToStream(options);
      options.stream.push('127.0.0.1\n');
      options.stream.push(null);
      await promise;
      expect(getListItemByValues).toBeCalledWith(expect.objectContaining({ value: ['127.0.0.1'] }));
    });

    test('It imports a set of items to a write buffer by calling "getListItemByValues" with two values given', async () => {
      ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce([]);
      const options = getImportListItemsToStreamOptionsMock();
      const promise = importListItemsToStream(options);
      options.stream.push('127.0.0.1\n');
      options.stream.push('127.0.0.2\n');
      options.stream.push(null);
      await promise;
      expect(getListItemByValues).toBeCalledWith(
        expect.objectContaining({ value: ['127.0.0.1', '127.0.0.2'] })
      );
    });
  });

  describe('writeBufferToItems', () => {
    test('It returns no duplicates and no lines processed when given empty items', async () => {
      ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce([]);
      const options = getWriteBufferToItemsOptionsMock();
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        duplicatesFound: 0,
        linesProcessed: 0,
      };
      expect(linesResult).toEqual(expected);
    });

    test('It returns no lines processed when given items but no buffer', async () => {
      const data = getListItemResponseMock();
      ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce([data]);
      const options = getWriteBufferToItemsOptionsMock();
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        duplicatesFound: 0,
        linesProcessed: 0,
      };
      expect(linesResult).toEqual(expected);
    });

    test('It returns 1 lines processed when given a buffer item that is not a duplicate', async () => {
      const data = getListItemResponseMock();
      ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce([data]);
      const options = getWriteBufferToItemsOptionsMock();
      options.buffer = ['255.255.255.255'];
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        duplicatesFound: 0,
        linesProcessed: 1,
      };
      expect(linesResult).toEqual(expected);
    });

    test('It filters a duplicate value out and reports it as a duplicate', async () => {
      const data = getListItemResponseMock();
      ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce([data]);
      const options = getWriteBufferToItemsOptionsMock();
      options.buffer = [data.value];
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        duplicatesFound: 1,
        linesProcessed: 0,
      };
      expect(linesResult).toEqual(expected);
    });

    test('It filters a duplicate value out and reports it as a duplicate and processing a second value as not a duplicate', async () => {
      const data = getListItemResponseMock();
      ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce([data]);
      const options = getWriteBufferToItemsOptionsMock();
      options.buffer = ['255.255.255.255', data.value];
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        duplicatesFound: 1,
        linesProcessed: 1,
      };
      expect(linesResult).toEqual(expected);
    });

    test('It filters a duplicate value out and reports it as a duplicate and processing two other values', async () => {
      const data = getListItemResponseMock();
      ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce([data]);
      const options = getWriteBufferToItemsOptionsMock();
      options.buffer = ['255.255.255.255', '192.168.0.1', data.value];
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        duplicatesFound: 1,
        linesProcessed: 2,
      };
      expect(linesResult).toEqual(expected);
    });

    test('It filters two duplicate values out and reports processes a single value', async () => {
      const dataItem1 = getListItemResponseMock();
      dataItem1.value = '127.0.0.1';
      const dataItem2 = getListItemResponseMock();
      dataItem2.value = '127.0.0.2';
      ((getListItemByValues as unknown) as jest.Mock).mockResolvedValueOnce([dataItem1, dataItem2]);
      const options = getWriteBufferToItemsOptionsMock();
      options.buffer = [dataItem1.value, dataItem2.value, '192.168.0.0.1'];
      const linesResult = await writeBufferToItems(options);
      const expected: LinesResult = {
        duplicatesFound: 2,
        linesProcessed: 1,
      };
      expect(linesResult).toEqual(expected);
    });
  });
});
