/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type { EntriesArray, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { entryHasNonEcsType, entryHasListType, shouldDisableBulkClose } from './utils';
import type { DataViewBase } from '@kbn/es-query';

const mockEcsIndexPattern = {
  title: 'testIndex',
  fields: [
    {
      name: 'some.parentField',
    },
    {
      name: 'some.not.nested.field',
    },
    {
      name: 'nested.field',
    },
  ],
} as DataViewBase;

describe('alerts_actions#utils', () => {
  describe('#entryHasListType', () => {
    test('it should return false with an empty array', () => {
      const payload: ExceptionListItemSchema[] = [];
      const result = entryHasListType(payload);
      expect(result).toEqual(false);
    });

    test("it should return false with exception items that don't contain a list type", () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const result = entryHasListType(payload);
      expect(result).toEqual(false);
    });

    test('it should return true with exception items that do contain a list type', () => {
      const payload = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ type: ListOperatorTypeEnum.LIST }] as EntriesArray,
        },
        getExceptionListItemSchemaMock(),
      ];
      const result = entryHasListType(payload);
      expect(result).toEqual(true);
    });
  });

  describe('#entryHasNonEcsType', () => {
    test('it should return false with an empty array', () => {
      const payload: ExceptionListItemSchema[] = [];
      const result = entryHasNonEcsType(payload, mockEcsIndexPattern);
      expect(result).toEqual(false);
    });

    test("it should return false with exception items that don't contain a non ecs type", () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const result = entryHasNonEcsType(payload, mockEcsIndexPattern);
      expect(result).toEqual(false);
    });

    test('it should return true with exception items that do contain a non ecs type', () => {
      const payload = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'some.nonEcsField' }] as EntriesArray,
        },
        getExceptionListItemSchemaMock(),
      ];
      const result = entryHasNonEcsType(payload, mockEcsIndexPattern);
      expect(result).toEqual(true);
    });
  });

  describe('#shouldDisableBulkClose', () => {
    it('returns true if items include large value lists', () => {
      expect(
        shouldDisableBulkClose({
          items: [
            {
              ...getExceptionListItemSchemaMock(),
              entries: [
                {
                  field: 'host.name',
                  list: { type: 'text', id: 'blob' },
                  operator: 'included',
                  type: 'list',
                },
              ],
            },
          ],
          signalIndexPatterns: mockEcsIndexPattern,
        })
      ).toBeTruthy();
    });

    it('returns true if items include non ECS types', () => {
      expect(
        shouldDisableBulkClose({
          items: [
            {
              ...getExceptionListItemSchemaMock(),
              entries: [{ field: 'some.nonEcsField' }] as EntriesArray,
            },
          ],
          signalIndexPatterns: mockEcsIndexPattern,
        })
      ).toBeTruthy();
    });

    it('returns true if all items have no entries', () => {
      expect(
        shouldDisableBulkClose({
          items: [
            {
              ...getExceptionListItemSchemaMock(),
              entries: [] as EntriesArray,
            },
          ],
          signalIndexPatterns: mockEcsIndexPattern,
        })
      ).toBeTruthy();
    });

    it('returns true if no items exist', () => {
      expect(
        shouldDisableBulkClose({
          items: [],
          signalIndexPatterns: mockEcsIndexPattern,
        })
      ).toBeTruthy();
    });

    it('returns false if no large value list entries exist and all are ECS compliant', () => {
      expect(
        shouldDisableBulkClose({
          items: [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()],
          signalIndexPatterns: mockEcsIndexPattern,
        })
      ).toBeFalsy();
    });
  });
});
