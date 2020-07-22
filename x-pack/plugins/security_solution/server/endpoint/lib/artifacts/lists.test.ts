/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExceptionListClient } from '../../../../../lists/server';
import { listMock } from '../../../../../lists/server/mocks';
import { getFoundExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { EntriesArray, EntryList } from '../../../../../lists/common/schemas/types';
import { buildArtifact, getFullEndpointExceptionList } from './lists';
import { TranslatedEntry, TranslatedExceptionListItem } from '../../schemas/artifacts';

describe('buildEventTypeSignal', () => {
  let mockExceptionClient: ExceptionListClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExceptionClient = listMock.getExceptionListClient();
  });

  test('it should convert the exception lists response to the proper endpoint format', async () => {
    const expectedEndpointExceptions = {
      type: 'simple',
      entries: [
        {
          entries: [
            {
              field: 'nested.field',
              operator: 'included',
              type: 'exact_cased',
              value: 'some value',
            },
          ],
          field: 'some.parentField',
          type: 'nested',
        },
        {
          field: 'some.not.nested.field',
          operator: 'included',
          type: 'exact_cased',
          value: 'some value',
        },
      ],
    };

    const first = getFoundExceptionListItemSchemaMock();
    mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);
    const resp = await getFullEndpointExceptionList(mockExceptionClient, 'linux', 'v1');
    expect(resp).toEqual({
      entries: [expectedEndpointExceptions],
    });
  });

  test('it should convert simple fields', async () => {
    const testEntries: EntriesArray = [
      { field: 'server.domain', operator: 'included', type: 'match', value: 'DOMAIN' },
      { field: 'server.ip', operator: 'included', type: 'match', value: '192.168.1.1' },
      { field: 'host.hostname', operator: 'included', type: 'match', value: 'estc' },
    ];

    const expectedEndpointExceptions = {
      type: 'simple',
      entries: [
        {
          field: 'server.domain',
          operator: 'included',
          type: 'exact_cased',
          value: 'DOMAIN',
        },
        {
          field: 'server.ip',
          operator: 'included',
          type: 'exact_cased',
          value: '192.168.1.1',
        },
        {
          field: 'host.hostname',
          operator: 'included',
          type: 'exact_cased',
          value: 'estc',
        },
      ],
    };

    const first = getFoundExceptionListItemSchemaMock();
    first.data[0].entries = testEntries;
    mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

    const resp = await getFullEndpointExceptionList(mockExceptionClient, 'linux', 'v1');
    expect(resp).toEqual({
      entries: [expectedEndpointExceptions],
    });
  });

  test('it should convert fields case sensitive', async () => {
    const testEntries: EntriesArray = [
      { field: 'server.domain.text', operator: 'included', type: 'match', value: 'DOMAIN' },
      { field: 'server.ip', operator: 'included', type: 'match', value: '192.168.1.1' },
      {
        field: 'host.hostname.text',
        operator: 'included',
        type: 'match_any',
        value: ['estc', 'kibana'],
      },
    ];

    const expectedEndpointExceptions = {
      type: 'simple',
      entries: [
        {
          field: 'server.domain',
          operator: 'included',
          type: 'exact_caseless',
          value: 'DOMAIN',
        },
        {
          field: 'server.ip',
          operator: 'included',
          type: 'exact_cased',
          value: '192.168.1.1',
        },
        {
          field: 'host.hostname',
          operator: 'included',
          type: 'exact_caseless_any',
          value: ['estc', 'kibana'],
        },
      ],
    };

    const first = getFoundExceptionListItemSchemaMock();
    first.data[0].entries = testEntries;
    mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

    const resp = await getFullEndpointExceptionList(mockExceptionClient, 'linux', 'v1');
    expect(resp).toEqual({
      entries: [expectedEndpointExceptions],
    });
  });

  test('it should deduplicate exception entries', async () => {
    const testEntries: EntriesArray = [
      { field: 'server.domain.text', operator: 'included', type: 'match', value: 'DOMAIN' },
      { field: 'server.domain.text', operator: 'included', type: 'match', value: 'DOMAIN' },
      { field: 'server.domain.text', operator: 'included', type: 'match', value: 'DOMAIN' },
      { field: 'server.ip', operator: 'included', type: 'match', value: '192.168.1.1' },
      {
        field: 'host.hostname.text',
        operator: 'included',
        type: 'match_any',
        value: ['estc', 'kibana'],
      },
    ];

    const expectedEndpointExceptions = {
      type: 'simple',
      entries: [
        {
          field: 'server.domain',
          operator: 'included',
          type: 'exact_caseless',
          value: 'DOMAIN',
        },
        {
          field: 'server.ip',
          operator: 'included',
          type: 'exact_cased',
          value: '192.168.1.1',
        },
        {
          field: 'host.hostname',
          operator: 'included',
          type: 'exact_caseless_any',
          value: ['estc', 'kibana'],
        },
      ],
    };

    const first = getFoundExceptionListItemSchemaMock();
    first.data[0].entries = testEntries;
    mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

    const resp = await getFullEndpointExceptionList(mockExceptionClient, 'linux', 'v1');
    expect(resp).toEqual({
      entries: [expectedEndpointExceptions],
    });
  });

  test('it should not deduplicate exception entries across nested boundaries', async () => {
    const testEntries: EntriesArray = [
      {
        entries: [
          { field: 'nested.field', operator: 'included', type: 'match', value: 'some value' },
        ],
        field: 'some.parentField',
        type: 'nested',
      },
      // Same as above but not inside the nest
      { field: 'nested.field', operator: 'included', type: 'match', value: 'some value' },
    ];

    const expectedEndpointExceptions = {
      type: 'simple',
      entries: [
        {
          entries: [
            {
              field: 'nested.field',
              operator: 'included',
              type: 'exact_cased',
              value: 'some value',
            },
          ],
          field: 'some.parentField',
          type: 'nested',
        },
        {
          field: 'nested.field',
          operator: 'included',
          type: 'exact_cased',
          value: 'some value',
        },
      ],
    };

    const first = getFoundExceptionListItemSchemaMock();
    first.data[0].entries = testEntries;
    mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

    const resp = await getFullEndpointExceptionList(mockExceptionClient, 'linux', 'v1');
    expect(resp).toEqual({
      entries: [expectedEndpointExceptions],
    });
  });

  test('it should deduplicate exception items', async () => {
    const testEntries: EntriesArray = [
      { field: 'server.domain.text', operator: 'included', type: 'match', value: 'DOMAIN' },
      { field: 'server.ip', operator: 'included', type: 'match', value: '192.168.1.1' },
    ];

    const expectedEndpointExceptions = {
      type: 'simple',
      entries: [
        {
          field: 'server.domain',
          operator: 'included',
          type: 'exact_caseless',
          value: 'DOMAIN',
        },
        {
          field: 'server.ip',
          operator: 'included',
          type: 'exact_cased',
          value: '192.168.1.1',
        },
      ],
    };

    const first = getFoundExceptionListItemSchemaMock();
    first.data[0].entries = testEntries;

    // Create a second exception item with the same entries
    first.data[1] = getExceptionListItemSchemaMock();
    first.data[1].entries = testEntries;
    mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

    const resp = await getFullEndpointExceptionList(mockExceptionClient, 'linux', 'v1');
    expect(resp).toEqual({
      entries: [expectedEndpointExceptions],
    });
  });

  test('it should ignore unsupported entries', async () => {
    // Lists and exists are not supported by the Endpoint
    const testEntries: EntriesArray = [
      { field: 'server.domain', operator: 'included', type: 'match', value: 'DOMAIN' },
      {
        field: 'server.domain',
        operator: 'included',
        type: 'list',
        list: {
          id: 'lists_not_supported',
          type: 'keyword',
        },
      } as EntryList,
      { field: 'server.ip', operator: 'included', type: 'exists' },
    ];

    const expectedEndpointExceptions = {
      type: 'simple',
      entries: [
        {
          field: 'server.domain',
          operator: 'included',
          type: 'exact_cased',
          value: 'DOMAIN',
        },
      ],
    };

    const first = getFoundExceptionListItemSchemaMock();
    first.data[0].entries = testEntries;
    mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

    const resp = await getFullEndpointExceptionList(mockExceptionClient, 'linux', 'v1');
    expect(resp).toEqual({
      entries: [expectedEndpointExceptions],
    });
  });

  test('it should convert the exception lists response to the proper endpoint format while paging', async () => {
    // The first call returns two exceptions
    const first = getFoundExceptionListItemSchemaMock();
    first.data.push(getExceptionListItemSchemaMock());

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
    const resp = await getFullEndpointExceptionList(mockExceptionClient, 'linux', 'v1');
    // Expect 2 exceptions, the first two calls returned the same exception list items
    expect(resp.entries.length).toEqual(2);
  });

  test('it should handle no exceptions', async () => {
    const exceptionsResponse = getFoundExceptionListItemSchemaMock();
    exceptionsResponse.data = [];
    exceptionsResponse.total = 0;
    mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionsResponse);
    const resp = await getFullEndpointExceptionList(mockExceptionClient, 'linux', 'v1');
    expect(resp.entries.length).toEqual(0);
  });

  test('it should return a stable hash regardless of order of entries', async () => {
    const translatedEntries: TranslatedEntry[] = [
      {
        entries: [
          {
            field: 'some.nested.field',
            operator: 'included',
            type: 'exact_cased',
            value: 'some value',
          },
        ],
        field: 'some.parentField',
        type: 'nested',
      },
      {
        field: 'nested.field',
        operator: 'included',
        type: 'exact_cased',
        value: 'some value',
      },
    ];
    const translatedEntriesReversed = translatedEntries.reverse();

    const translatedExceptionList = {
      entries: [
        {
          type: 'simple',
          entries: translatedEntries,
        },
      ],
    };

    const translatedExceptionListReversed = {
      entries: [
        {
          type: 'simple',
          entries: translatedEntriesReversed,
        },
      ],
    };

    const artifact1 = await buildArtifact(translatedExceptionList, 'linux', 'v1');
    const artifact2 = await buildArtifact(translatedExceptionListReversed, 'linux', 'v1');
    expect(artifact1.decodedSha256).toEqual(artifact2.decodedSha256);
  });

  test('it should return a stable hash regardless of order of items', async () => {
    const translatedItems: TranslatedExceptionListItem[] = [
      {
        type: 'simple',
        entries: [
          {
            entries: [
              {
                field: 'some.nested.field',
                operator: 'included',
                type: 'exact_cased',
                value: 'some value',
              },
            ],
            field: 'some.parentField',
            type: 'nested',
          },
        ],
      },
      {
        type: 'simple',
        entries: [
          {
            field: 'nested.field',
            operator: 'included',
            type: 'exact_cased',
            value: 'some value',
          },
        ],
      },
    ];

    const translatedExceptionList = {
      entries: translatedItems,
    };

    const translatedExceptionListReversed = {
      entries: translatedItems.reverse(),
    };

    const artifact1 = await buildArtifact(translatedExceptionList, 'linux', 'v1');
    const artifact2 = await buildArtifact(translatedExceptionListReversed, 'linux', 'v1');
    expect(artifact1.decodedSha256).toEqual(artifact2.decodedSha256);
  });
});
