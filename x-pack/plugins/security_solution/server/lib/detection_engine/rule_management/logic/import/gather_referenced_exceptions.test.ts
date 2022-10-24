/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { findExceptionList } from '@kbn/lists-plugin/server/services/exception_lists/find_exception_list';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import { getImportRulesSchemaMock } from '../../../../../../common/detection_engine/rule_management/mocks';
import { getReferencedExceptionLists } from './gather_referenced_exceptions';

jest.mock('@kbn/lists-plugin/server/services/exception_lists/find_exception_list');

describe('getReferencedExceptionLists', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();

    (findExceptionList as jest.Mock).mockResolvedValue({
      data: [
        {
          ...getExceptionListSchemaMock(),
          id: '123',
          list_id: 'my-list',
          namespace_type: 'single',
          type: 'detection',
        },
      ],
      page: 1,
      per_page: 20,
      total: 1,
    });
    jest.clearAllMocks();
  });

  it('returns empty object if no rules to search', async () => {
    const result = await getReferencedExceptionLists({
      rules: [],
      savedObjectsClient,
    });

    expect(result).toEqual({});
  });

  it('returns found referenced exception lists', async () => {
    const result = await getReferencedExceptionLists({
      rules: [
        {
          ...getImportRulesSchemaMock(),
          exceptions_list: [
            { id: '123', list_id: 'my-list', namespace_type: 'single', type: 'detection' },
          ],
        },
      ],
      savedObjectsClient,
    });

    expect(result).toEqual({
      'my-list': {
        ...getExceptionListSchemaMock(),
        id: '123',
        list_id: 'my-list',
        namespace_type: 'single',
        type: 'detection',
      },
    });
  });

  it('returns found referenced exception lists when first exceptions list is empty array and second list has a value', async () => {
    const result = await getReferencedExceptionLists({
      rules: [
        {
          ...getImportRulesSchemaMock(),
          exceptions_list: [],
        },
        {
          ...getImportRulesSchemaMock(),
          exceptions_list: [
            { id: '123', list_id: 'my-list', namespace_type: 'single', type: 'detection' },
          ],
        },
      ],
      savedObjectsClient,
    });

    expect(result).toEqual({
      'my-list': {
        ...getExceptionListSchemaMock(),
        id: '123',
        list_id: 'my-list',
        namespace_type: 'single',
        type: 'detection',
      },
    });
  });

  it('returns found referenced exception lists when two rules reference same list', async () => {
    const result = await getReferencedExceptionLists({
      rules: [
        {
          ...getImportRulesSchemaMock(),
          exceptions_list: [
            { id: '123', list_id: 'my-list', namespace_type: 'single', type: 'detection' },
          ],
        },
        {
          ...getImportRulesSchemaMock(),
          exceptions_list: [
            { id: '123', list_id: 'my-list', namespace_type: 'single', type: 'detection' },
          ],
        },
      ],
      savedObjectsClient,
    });

    expect(result).toEqual({
      'my-list': {
        ...getExceptionListSchemaMock(),
        id: '123',
        list_id: 'my-list',
        namespace_type: 'single',
        type: 'detection',
      },
    });
  });

  it('returns two found referenced exception lists when two rules reference different lists', async () => {
    (findExceptionList as jest.Mock).mockResolvedValue({
      data: [
        {
          ...getExceptionListSchemaMock(),
          id: '123',
          list_id: 'my-list',
          namespace_type: 'single',
          type: 'detection',
        },
        {
          ...getExceptionListSchemaMock(),
          id: '456',
          list_id: 'other-list',
          namespace_type: 'single',
          type: 'detection',
        },
      ],
      page: 1,
      per_page: 20,
      total: 2,
    });

    const result = await getReferencedExceptionLists({
      rules: [
        {
          ...getImportRulesSchemaMock(),
          exceptions_list: [
            { id: '456', list_id: 'other-list', namespace_type: 'single', type: 'detection' },
          ],
        },
        {
          ...getImportRulesSchemaMock(),
          exceptions_list: [
            { id: '123', list_id: 'my-list', namespace_type: 'single', type: 'detection' },
          ],
        },
      ],
      savedObjectsClient,
    });

    expect(result).toEqual({
      'my-list': {
        ...getExceptionListSchemaMock(),
        id: '123',
        list_id: 'my-list',
        namespace_type: 'single',
        type: 'detection',
      },
      'other-list': {
        ...getExceptionListSchemaMock(),
        id: '456',
        list_id: 'other-list',
        namespace_type: 'single',
        type: 'detection',
      },
    });
  });

  it('returns empty object if no referenced exception lists found', async () => {
    const result = await getReferencedExceptionLists({
      rules: [],
      savedObjectsClient,
    });

    expect(result).toEqual({});
  });
});
