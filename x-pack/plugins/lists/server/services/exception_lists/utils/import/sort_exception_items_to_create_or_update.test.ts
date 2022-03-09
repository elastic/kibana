/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getImportExceptionsListItemSchemaDecodedMock } from '../../../../../common/schemas/request/import_exceptions_schema.mock';
import { getExceptionListSchemaMock } from '../../../../../common/schemas/response/exception_list_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../../../common/schemas/response/exception_list_item_schema.mock';

import { sortExceptionItemsToUpdateOrCreate } from './sort_exception_items_to_create_update';

jest.mock('uuid', () => ({
  v4: (): string => 'NEW_UUID',
}));

describe('sort_exception_lists_items_to_create_update', () => {
  beforeEach(() =>
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2021-12-07T09:13:51.888Z')
  );
  afterAll(() => jest.restoreAllMocks());

  describe('sortExceptionItemsToUpdateOrCreate', () => {
    describe('overwrite is false', () => {
      it('assigns error if no matching item list_id found', () => {
        const result = sortExceptionItemsToUpdateOrCreate({
          existingItems: {},
          existingLists: {},
          isOverwrite: false,
          items: [getImportExceptionsListItemSchemaDecodedMock('item-id-1', 'list-id-1')],
          user: 'elastic',
        });

        expect(result).toEqual({
          errors: [
            {
              error: {
                message:
                  'Exception list with list_id: "list-id-1", not found for exception list item with item_id: "item-id-1"',
                status_code: 409,
              },
              item_id: 'item-id-1',
              list_id: 'list-id-1',
            },
          ],
          itemsToCreate: [],
          itemsToUpdate: [],
        });
      });

      it('assigns item to be created if no matching item found', () => {
        const result = sortExceptionItemsToUpdateOrCreate({
          existingItems: {},
          existingLists: {
            'list-id-1': { ...getExceptionListSchemaMock(), list_id: 'list-id-1' },
          },
          isOverwrite: false,
          items: [getImportExceptionsListItemSchemaDecodedMock('item-id-1', 'list-id-1')],
          user: 'elastic',
        });

        expect(result).toEqual({
          errors: [],
          itemsToCreate: [
            {
              attributes: {
                comments: [],
                created_at: '2021-12-07T09:13:51.888Z',
                created_by: 'elastic',
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
                immutable: undefined,
                item_id: 'item-id-1',
                list_id: 'list-id-1',
                list_type: 'item',
                meta: undefined,
                name: 'Query with a rule id',
                os_types: [],
                tags: [],
                tie_breaker_id: 'NEW_UUID',
                type: 'simple',
                updated_by: 'elastic',
                version: undefined,
              },
              type: 'exception-list',
            },
          ],
          itemsToUpdate: [],
        });
      });

      it('assigns error if matching item found', () => {
        const result = sortExceptionItemsToUpdateOrCreate({
          existingItems: {
            'item-id-1': {
              ...getExceptionListItemSchemaMock({ item_id: 'item-id-1', list_id: 'list-id-1' }),
            },
          },
          existingLists: {
            'list-id-1': { ...getExceptionListSchemaMock(), list_id: 'list-id-1' },
          },
          isOverwrite: false,
          items: [getImportExceptionsListItemSchemaDecodedMock('item-id-1', 'list-id-1')],
          user: 'elastic',
        });

        expect(result).toEqual({
          errors: [
            {
              error: {
                message:
                  'Found that item_id: "item-id-1" already exists. Import of item_id: "item-id-1" skipped.',
                status_code: 409,
              },
              item_id: 'item-id-1',
              list_id: 'list-id-1',
            },
          ],
          itemsToCreate: [],
          itemsToUpdate: [],
        });
      });
    });

    describe('overwrite is true', () => {
      it('assigns error if no matching item list_id found', () => {
        const result = sortExceptionItemsToUpdateOrCreate({
          existingItems: {},
          existingLists: {},
          isOverwrite: true,
          items: [getImportExceptionsListItemSchemaDecodedMock('item-id-1', 'list-id-1')],
          user: 'elastic',
        });

        expect(result).toEqual({
          errors: [
            {
              error: {
                message:
                  'Exception list with list_id: "list-id-1", not found for exception list item with item_id: "item-id-1"',
                status_code: 409,
              },
              item_id: 'item-id-1',
              list_id: 'list-id-1',
            },
          ],
          itemsToCreate: [],
          itemsToUpdate: [],
        });
      });

      it('assigns error if matching item_id found but differing list_id', () => {
        const result = sortExceptionItemsToUpdateOrCreate({
          existingItems: {
            'item-id-1': {
              ...getExceptionListItemSchemaMock({ item_id: 'item-id-1', list_id: 'list-id-2' }),
            },
          },
          existingLists: {
            'list-id-1': { ...getExceptionListSchemaMock(), list_id: 'list-id-1' },
          },
          isOverwrite: true,
          items: [getImportExceptionsListItemSchemaDecodedMock('item-id-1', 'list-id-1')],
          user: 'elastic',
        });

        expect(result).toEqual({
          errors: [
            {
              error: {
                message:
                  'Error trying to update item_id: "item-id-1" and list_id: "list-id-1". The item already exists under list_id: list-id-2',
                status_code: 409,
              },
              item_id: 'item-id-1',
              list_id: 'list-id-1',
            },
          ],
          itemsToCreate: [],
          itemsToUpdate: [],
        });
      });

      it('assigns item to be created if no matching item found', () => {
        const result = sortExceptionItemsToUpdateOrCreate({
          existingItems: {},
          existingLists: {
            'list-id-1': { ...getExceptionListSchemaMock(), list_id: 'list-id-1' },
          },
          isOverwrite: true,
          items: [getImportExceptionsListItemSchemaDecodedMock('item-id-1', 'list-id-1')],
          user: 'elastic',
        });

        expect(result).toEqual({
          errors: [],
          itemsToCreate: [
            {
              attributes: {
                comments: [],
                created_at: '2021-12-07T09:13:51.888Z',
                created_by: 'elastic',
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
                immutable: undefined,
                item_id: 'item-id-1',
                list_id: 'list-id-1',
                list_type: 'item',
                meta: undefined,
                name: 'Query with a rule id',
                os_types: [],
                tags: [],
                tie_breaker_id: 'NEW_UUID',
                type: 'simple',
                updated_by: 'elastic',
                version: undefined,
              },
              type: 'exception-list',
            },
          ],
          itemsToUpdate: [],
        });
      });

      it('assigns item to be updated if matching item found', () => {
        const result = sortExceptionItemsToUpdateOrCreate({
          existingItems: {
            'item-id-1': {
              ...getExceptionListItemSchemaMock({ item_id: 'item-id-1', list_id: 'list-id-1' }),
            },
          },
          existingLists: {
            'list-id-1': { ...getExceptionListSchemaMock(), list_id: 'list-id-1' },
          },
          isOverwrite: true,
          items: [getImportExceptionsListItemSchemaDecodedMock('item-id-1', 'list-id-1')],
          user: 'elastic',
        });

        expect(result).toEqual({
          errors: [],
          itemsToCreate: [],
          itemsToUpdate: [
            {
              attributes: {
                comments: [],
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
                meta: undefined,
                name: 'Query with a rule id',
                os_types: [],
                tags: [],
                type: 'simple',
                updated_by: 'elastic',
              },
              id: '1',
              type: 'exception-list',
            },
          ],
        });
      });
    });
  });
});
