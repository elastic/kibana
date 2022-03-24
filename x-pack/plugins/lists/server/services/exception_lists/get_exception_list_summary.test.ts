/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { ExceptionListSummarySchema } from '@kbn/securitysolution-io-ts-list-types';

import type { SavedObjectsClientContract } from '../../../../../../src/core/server';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';

import { getExceptionListSummary } from './get_exception_list_summary';

describe('get_exception_list_summary', () => {
  describe('getExceptionListSummary', () => {
    let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

    beforeEach(() => {
      savedObjectsClient = savedObjectsClientMock.create();
    });

    test('it should aggregate items if not host isolation exception artifact', async () => {
      const savedObject = {
        aggregations: {
          by_os: {
            buckets: [
              { doc_count: 2, key: 'linux' },
              { doc_count: 3, key: 'macos' },
              { doc_count: 5, key: 'windows' },
            ],
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
          },
        },
        page: 1,
        per_page: 0,
        saved_objects: [],
        total: 10,
      };
      savedObjectsClient.find.mockResolvedValue(savedObject);

      const summary = (await getExceptionListSummary({
        filter: undefined,
        id: undefined,
        listId: '',
        namespaceType: 'agnostic',
        savedObjectsClient,
      })) as ExceptionListSummarySchema;

      expect(summary.total).toEqual(10);
    });

    test('it should NOT aggregate items if host isolation exception artifact', async () => {
      const savedObject = {
        aggregations: {
          by_os: {
            buckets: [
              { doc_count: 3, key: 'linux' },
              { doc_count: 3, key: 'macos' },
              { doc_count: 3, key: 'windows' },
            ],
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
          },
        },
        page: 1,
        per_page: 0,
        saved_objects: [],
        total: 3,
      };
      savedObjectsClient.find.mockResolvedValue(savedObject);

      const summary = (await getExceptionListSummary({
        filter: undefined,
        id: undefined,
        listId: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
        namespaceType: 'agnostic',
        savedObjectsClient,
      })) as ExceptionListSummarySchema;

      expect(summary.total).toEqual(3);
    });
  });
});
