/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getImportExceptionsListSchemaDecodedMock } from '../../../../../common/schemas/request/import_exceptions_schema.mock';
import { getExceptionListSchemaMock } from '../../../../../common/schemas/response/exception_list_schema.mock';

import { sortExceptionListsToUpdateOrCreate } from './sort_exception_lists_to_create_update';

jest.mock('uuid', () => ({
  v4: (): string => 'NEW_UUID',
}));

describe('sort_exception_lists_to_create_update', () => {
  beforeEach(() =>
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2021-12-07T09:13:51.888Z')
  );
  afterAll(() => jest.restoreAllMocks());

  describe('sortExceptionListsToUpdateOrCreate', () => {
    describe('overwrite is false', () => {
      it('assigns list to create if its list_id does not match an existing one', () => {
        const result = sortExceptionListsToUpdateOrCreate({
          existingLists: {},
          isOverwrite: false,
          lists: [getImportExceptionsListSchemaDecodedMock('list-id-1')],
          user: 'elastic',
        });

        expect(result).toEqual({
          errors: [],
          listItemsToDelete: [],
          listsToCreate: [
            {
              attributes: {
                comments: undefined,
                created_at: '2021-12-07T09:13:51.888Z',
                created_by: 'elastic',
                description: 'some description',
                entries: undefined,
                immutable: false,
                item_id: undefined,
                list_id: 'list-id-1',
                list_type: 'list',
                meta: undefined,
                name: 'Query with a rule id',
                os_types: [],
                tags: [],
                tie_breaker_id: 'NEW_UUID',
                type: 'detection',
                updated_by: 'elastic',
                version: 1,
              },
              type: 'exception-list',
            },
          ],
          listsToUpdate: [],
        });
      });

      it('assigns error if matching list_id is found', () => {
        const result = sortExceptionListsToUpdateOrCreate({
          existingLists: {
            'list-id-1': { ...getExceptionListSchemaMock(), list_id: 'list-id-1' },
          },
          isOverwrite: false,
          lists: [getImportExceptionsListSchemaDecodedMock('list-id-1')],
          user: 'elastic',
        });

        expect(result).toEqual({
          errors: [
            {
              error: {
                message:
                  'Found that list_id: "list-id-1" already exists. Import of list_id: "list-id-1" skipped.',
                status_code: 409,
              },
              list_id: 'list-id-1',
            },
          ],
          listItemsToDelete: [],
          listsToCreate: [],
          listsToUpdate: [],
        });
      });
    });

    describe('overwrite is true', () => {
      it('assigns list to be created if its list_id does not match an existing one', () => {
        const result = sortExceptionListsToUpdateOrCreate({
          existingLists: {},
          isOverwrite: true,
          lists: [getImportExceptionsListSchemaDecodedMock('list-id-1')],
          user: 'elastic',
        });

        expect(result).toEqual({
          errors: [],
          listItemsToDelete: [],
          listsToCreate: [
            {
              attributes: {
                comments: undefined,
                created_at: '2021-12-07T09:13:51.888Z',
                created_by: 'elastic',
                description: 'some description',
                entries: undefined,
                immutable: false,
                item_id: undefined,
                list_id: 'list-id-1',
                list_type: 'list',
                meta: undefined,
                name: 'Query with a rule id',
                os_types: [],
                tags: [],
                tie_breaker_id: 'NEW_UUID',
                type: 'detection',
                updated_by: 'elastic',
                version: 1,
              },
              type: 'exception-list',
            },
          ],
          listsToUpdate: [],
        });
      });

      it('assigns list to be updated if its list_id matches an existing one', () => {
        const result = sortExceptionListsToUpdateOrCreate({
          existingLists: {
            'list-id-1': { ...getExceptionListSchemaMock(), list_id: 'list-id-1' },
          },
          isOverwrite: true,
          lists: [getImportExceptionsListSchemaDecodedMock('list-id-1')],
          user: 'elastic',
        });

        expect(result).toEqual({
          errors: [],
          listItemsToDelete: [['list-id-1', 'single']],
          listsToCreate: [],
          listsToUpdate: [
            {
              attributes: {
                description: 'some description',
                meta: undefined,
                name: 'Query with a rule id',
                tags: [],
                type: 'detection',
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
