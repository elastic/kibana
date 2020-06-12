/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExceptionListClient } from '../../../../lists/server/services/exception_lists/exception_list_client';
import { listMock } from '../../../../lists/server/mocks';
import { GetFullEndpointExceptionList } from './fetch_endpoint_exceptions';
import { getFoundExceptionListItemSchemaMock } from '../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../../lists/common/schemas/response/exception_list_item_schema.mock';

describe('buildEventTypeSignal', () => {
  let mockExceptionClient: ExceptionListClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExceptionClient = listMock.getExceptionList();
  });

  test('it should convert the exception lists response to the proper endpoint format', async () => {
    const expectedEndpointExceptions = {
      exceptions_list: [
        {
          entries: [
            {
              entry: { exact_caseless: 'Elastic, N.V.' },
              field: 'actingProcess.file.signer',
              operator: 'included',
            },
            {
              entry: { exact_caseless_any: ['process', 'malware'] },
              field: 'event.category',
              operator: 'included',
            },
          ],
          type: 'simple',
        },
      ],
    };

    const first = getFoundExceptionListItemSchemaMock();
    mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);
    const resp = await GetFullEndpointExceptionList(mockExceptionClient, 'linux');
    expect(resp).toEqual(expectedEndpointExceptions);
  });

  test('it should convert the exception lists response to the proper endpoint format while paging', async () => {
    // The first call returns one exception
    const first = getFoundExceptionListItemSchemaMock();

    // The second call returns two exceptions
    const second = getFoundExceptionListItemSchemaMock();
    second.data.push(getExceptionListItemSchemaMock());

    // The third call returns no exceptions, paging stops
    const third = getFoundExceptionListItemSchemaMock();
    third.data = [];
    mockExceptionClient.findExceptionListItem = jest
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
      .mockReturnValueOnce(third);
    const resp = await GetFullEndpointExceptionList(mockExceptionClient, 'linux');
    expect(resp.exceptions_list.length).toEqual(3);
  });
});
