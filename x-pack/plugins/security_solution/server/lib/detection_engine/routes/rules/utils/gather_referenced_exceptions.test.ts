/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import { savedObjectsClientMock } from '../../../../../../../../../src/core/server/mocks';
import { findExceptionList } from '../../../../../../../lists/server/services/exception_lists/find_exception_list';
import { getExceptionListSchemaMock } from '../../../../../../../lists/common/schemas/response/exception_list_schema.mock';
import { getReferencedExceptionLists } from './gather_referenced_exceptions';
import { getImportRulesSchemaDecodedMock } from '../../../../../../common/detection_engine/schemas/request/import_rules_schema.mock';

jest.mock('../../../../../../../lists/server/services/exception_lists/find_exception_list');

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
          ...getImportRulesSchemaDecodedMock(),
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

  it('returns empty object if no referenced exception lists found', async () => {
    const result = await getReferencedExceptionLists({
      rules: [],
      savedObjectsClient,
    });

    expect(result).toEqual({});
  });
});
