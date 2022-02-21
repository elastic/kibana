/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '../../../../../../../../src/core/server/mocks';
import type { SavedObjectsClientContract } from '../../../../../../../../src/core/server';
import { findExceptionList } from '../../find_exception_list';

import { findAllListTypes, getAllListTypes, getListFilter } from './find_all_exception_list_types';

jest.mock('../../find_exception_list');

describe('find_all_exception_list_item_types', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    jest.clearAllMocks();
  });

  describe('getListFilter', () => {
    it('formats agnostic filter', () => {
      const result = getListFilter({
        namespaceType: 'agnostic',
        objects: [
          { listId: '1', namespaceType: 'agnostic' },
          { listId: '2', namespaceType: 'agnostic' },
        ],
      });

      expect(result).toEqual('exception-list-agnostic.attributes.list_id:(1 OR 2)');
    });

    it('formats single filter', () => {
      const result = getListFilter({
        namespaceType: 'single',
        objects: [
          { listId: '1', namespaceType: 'single' },
          { listId: '2', namespaceType: 'single' },
        ],
      });

      expect(result).toEqual('exception-list.attributes.list_id:(1 OR 2)');
    });
  });

  describe('findAllListTypes', () => {
    it('returns null if no lists to find', async () => {
      const result = await findAllListTypes([], [], savedObjectsClient);

      expect(result).toBeNull();
    });

    it('searches for agnostic lists if no non agnostic lists passed in', async () => {
      await findAllListTypes([{ listId: '1', namespaceType: 'agnostic' }], [], savedObjectsClient);

      expect(findExceptionList).toHaveBeenCalledWith({
        filter: 'exception-list-agnostic.attributes.list_id:(1)',
        namespaceType: ['agnostic'],
        page: undefined,
        perPage: 100,
        savedObjectsClient,
        sortField: undefined,
        sortOrder: undefined,
      });
    });

    it('searches for non agnostic lists if no agnostic lists passed in', async () => {
      await findAllListTypes([], [{ listId: '1', namespaceType: 'single' }], savedObjectsClient);

      expect(findExceptionList).toHaveBeenCalledWith({
        filter: 'exception-list.attributes.list_id:(1)',
        namespaceType: ['single'],
        page: undefined,
        perPage: 100,
        savedObjectsClient,
        sortField: undefined,
        sortOrder: undefined,
      });
    });

    it('searches for both agnostic an non agnostic lists if some of both passed in', async () => {
      await findAllListTypes(
        [{ listId: '1', namespaceType: 'agnostic' }],
        [{ listId: '2', namespaceType: 'single' }],
        savedObjectsClient
      );

      expect(findExceptionList).toHaveBeenCalledWith({
        filter:
          'exception-list-agnostic.attributes.list_id:(1) OR exception-list.attributes.list_id:(2)',
        namespaceType: ['single', 'agnostic'],
        page: undefined,
        perPage: 100,
        savedObjectsClient,
        sortField: undefined,
        sortOrder: undefined,
      });
    });
  });

  describe('getAllListTypes', () => {
    it('returns empty object if no items to find', async () => {
      const result = await getAllListTypes([], [], savedObjectsClient);

      expect(result).toEqual({});
    });

    it('returns found items', async () => {
      (findExceptionList as jest.Mock).mockResolvedValue({
        data: [
          {
            description: 'some description',
            id: '14aec120-5667-11ec-ae56-7ddc0e93145f',
            list_id: '1',
            name: 'Query with a rule id',
            namespaces: ['default'],
            references: [],
            tags: [],
            type: 'detection',
            updated_at: '2021-12-06T07:35:27.941Z',
            updated_by: 'elastic',
            version: 'WzE0MTc5MiwxXQ==',
          },
        ],
        page: 1,
        per_page: 100,
        total: 1,
      });
      const result = await getAllListTypes(
        [{ listId: '1', namespaceType: 'agnostic' }],
        [{ listId: '2', namespaceType: 'single' }],
        savedObjectsClient
      );

      expect(result).toEqual({
        '1': {
          description: 'some description',
          id: '14aec120-5667-11ec-ae56-7ddc0e93145f',
          list_id: '1',
          name: 'Query with a rule id',
          namespaces: ['default'],
          references: [],
          tags: [],
          type: 'detection',
          updated_at: '2021-12-06T07:35:27.941Z',
          updated_by: 'elastic',
          version: 'WzE0MTc5MiwxXQ==',
        },
      });
    });
  });
});
