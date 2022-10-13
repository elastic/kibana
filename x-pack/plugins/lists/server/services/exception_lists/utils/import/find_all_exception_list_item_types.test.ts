/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { getImportExceptionsListItemSchemaDecodedMock } from '../../../../../common/schemas/request/import_exceptions_schema.mock';

import {
  findAllListItemTypes,
  getAllListItemTypes,
  getItemsFilter,
} from './find_all_exception_list_item_types';

describe('find_all_exception_list_item_types', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
  });

  describe('getItemsFilter', () => {
    it('formats agnostic filter', () => {
      const result = getItemsFilter({
        namespaceType: 'agnostic',
        objects: [
          getImportExceptionsListItemSchemaDecodedMock('1'),
          getImportExceptionsListItemSchemaDecodedMock('2'),
        ],
      });

      expect(result).toEqual('exception-list-agnostic.attributes.item_id:(1 OR 2)');
    });

    it('formats single filter', () => {
      const result = getItemsFilter({
        namespaceType: 'single',
        objects: [
          getImportExceptionsListItemSchemaDecodedMock('1'),
          getImportExceptionsListItemSchemaDecodedMock('2'),
        ],
      });

      expect(result).toEqual('exception-list.attributes.item_id:(1 OR 2)');
    });
  });

  describe('findAllListItemTypes', () => {
    it('returns null if no items to find', async () => {
      const result = await findAllListItemTypes([], [], savedObjectsClient);

      expect(result).toBeNull();
    });

    it('searches for agnostic items if no non agnostic items passed in', async () => {
      await findAllListItemTypes(
        [{ ...getImportExceptionsListItemSchemaDecodedMock('1'), namespace_type: 'agnostic' }],
        [],
        savedObjectsClient
      );

      expect(savedObjectsClient.find).toHaveBeenCalledWith({
        filter:
          '((exception-list-agnostic.attributes.list_type: item AND exception-list-agnostic.attributes.list_id: "detection_list_id") AND exception-list-agnostic.attributes.item_id:(1))',
        page: undefined,
        perPage: 100,
        sortField: undefined,
        sortOrder: undefined,
        type: ['exception-list-agnostic'],
      });
    });

    it('searches for non agnostic items if no agnostic items passed in', async () => {
      await findAllListItemTypes(
        [],
        [{ ...getImportExceptionsListItemSchemaDecodedMock('1'), namespace_type: 'single' }],
        savedObjectsClient
      );

      expect(savedObjectsClient.find).toHaveBeenCalledWith({
        filter:
          '((exception-list.attributes.list_type: item AND exception-list.attributes.list_id: "detection_list_id") AND exception-list.attributes.item_id:(1))',
        page: undefined,
        perPage: 100,
        sortField: undefined,
        sortOrder: undefined,
        type: ['exception-list'],
      });
    });

    it('searches for both agnostic an non agnostic items if some of both passed in', async () => {
      await findAllListItemTypes(
        [{ ...getImportExceptionsListItemSchemaDecodedMock('1'), namespace_type: 'agnostic' }],
        [{ ...getImportExceptionsListItemSchemaDecodedMock('2'), namespace_type: 'single' }],
        savedObjectsClient
      );

      expect(savedObjectsClient.find).toHaveBeenCalledWith({
        filter:
          '((exception-list.attributes.list_type: item AND exception-list.attributes.list_id: "detection_list_id") AND exception-list.attributes.item_id:(2)) OR ((exception-list-agnostic.attributes.list_type: item AND exception-list-agnostic.attributes.list_id: "detection_list_id") AND exception-list-agnostic.attributes.item_id:(1))',
        page: undefined,
        perPage: 100,
        sortField: undefined,
        sortOrder: undefined,
        type: ['exception-list', 'exception-list-agnostic'],
      });
    });
  });

  describe('getAllListItemTypes', () => {
    it('returns empty object if no items to find', async () => {
      const result = await getAllListItemTypes([], [], savedObjectsClient);

      expect(result).toEqual({});
    });

    it('returns found items', async () => {
      savedObjectsClient.find.mockResolvedValue({
        page: 1,
        per_page: 100,
        saved_objects: [
          {
            attributes: {
              description: 'some description',
              item_id: 'item-id-1',
              name: 'Query with a rule id',
              tags: [],
              type: 'detection',
              updated_by: 'elastic',
            },
            id: '14aec120-5667-11ec-ae56-7ddc0e93145f',
            namespaces: ['default'],
            references: [],
            score: 1,
            type: 'exception-list',
            updated_at: '2021-12-06T07:35:27.941Z',
            version: 'WzE0MTc5MiwxXQ==',
          },
        ],
        total: 1,
      });
      const result = await getAllListItemTypes(
        [{ ...getImportExceptionsListItemSchemaDecodedMock('1'), namespace_type: 'agnostic' }],
        [{ ...getImportExceptionsListItemSchemaDecodedMock('2'), namespace_type: 'single' }],
        savedObjectsClient
      );

      expect(result).toEqual({
        'item-id-1': {
          _version: 'WzE0MTc5MiwxXQ==',
          comments: [],
          created_at: undefined,
          created_by: undefined,
          description: 'some description',
          entries: [],
          id: '14aec120-5667-11ec-ae56-7ddc0e93145f',
          item_id: 'item-id-1',
          list_id: undefined,
          meta: undefined,
          name: 'Query with a rule id',
          namespace_type: 'single',
          os_types: undefined,
          tags: [],
          tie_breaker_id: undefined,
          type: 'simple',
          updated_at: '2021-12-06T07:35:27.941Z',
          updated_by: 'elastic',
        },
      });
    });
  });
});
