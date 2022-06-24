/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListClient } from '@kbn/lists-plugin/server';
import { listMock } from '@kbn/lists-plugin/server/mocks';
import { getFoundExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/found_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type { EntriesArray, EntryList } from '@kbn/securitysolution-io-ts-list-types';
import { buildArtifact, getEndpointExceptionList, getFilteredEndpointExceptionList } from './lists';
import { TranslatedEntry, TranslatedExceptionListItem } from '../../schemas/artifacts';
import { ArtifactConstants } from './common';
import {
  ENDPOINT_BLOCKLISTS_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
  ENDPOINT_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
} from '@kbn/securitysolution-list-constants';

describe('artifacts lists', () => {
  let mockExceptionClient: ExceptionListClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExceptionClient = listMock.getExceptionListClient();
  });

  describe('getFilteredEndpointExceptionList', () => {
    const TEST_FILTER = 'exception-list-agnostic.attributes.os_types:"linux"';

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
      const resp = await getFilteredEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        filter: TEST_FILTER,
        listId: ENDPOINT_LIST_ID,
      });
      expect(resp).toEqual({
        entries: [expectedEndpointExceptions],
      });
    });

    test('it should convert simple fields', async () => {
      const testEntries: EntriesArray = [
        { field: 'host.os.full', operator: 'included', type: 'match', value: 'windows' },
        { field: 'server.ip', operator: 'included', type: 'match', value: '192.168.1.1' },
        { field: 'host.hostname', operator: 'included', type: 'match', value: 'estc' },
      ];

      const expectedEndpointExceptions = {
        type: 'simple',
        entries: [
          {
            field: 'host.os.full',
            operator: 'included',
            type: 'exact_cased',
            value: 'windows',
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

      const resp = await getFilteredEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        filter: TEST_FILTER,
        listId: ENDPOINT_LIST_ID,
      });
      expect(resp).toEqual({
        entries: [expectedEndpointExceptions],
      });
    });

    test('it should convert fields case sensitive', async () => {
      const testEntries: EntriesArray = [
        { field: 'host.os.full.caseless', operator: 'included', type: 'match', value: 'windows' },
        { field: 'server.ip', operator: 'included', type: 'match', value: '192.168.1.1' },
        {
          field: 'host.hostname.caseless',
          operator: 'included',
          type: 'match_any',
          value: ['estc', 'kibana'],
        },
      ];

      const expectedEndpointExceptions = {
        type: 'simple',
        entries: [
          {
            field: 'host.os.full',
            operator: 'included',
            type: 'exact_caseless',
            value: 'windows',
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

      const resp = await getFilteredEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        filter: TEST_FILTER,
        listId: ENDPOINT_LIST_ID,
      });
      expect(resp).toEqual({
        entries: [expectedEndpointExceptions],
      });
    });

    test('it should deduplicate exception entries', async () => {
      const testEntries: EntriesArray = [
        { field: 'host.os.full.caseless', operator: 'included', type: 'match', value: 'windows' },
        { field: 'host.os.full.caseless', operator: 'included', type: 'match', value: 'windows' },
        { field: 'host.os.full.caseless', operator: 'included', type: 'match', value: 'windows' },
        { field: 'server.ip', operator: 'included', type: 'match', value: '192.168.1.1' },
        {
          field: 'host.hostname',
          operator: 'included',
          type: 'match_any',
          value: ['estc', 'kibana'],
        },
      ];

      const expectedEndpointExceptions = {
        type: 'simple',
        entries: [
          {
            field: 'host.os.full',
            operator: 'included',
            type: 'exact_caseless',
            value: 'windows',
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
            type: 'exact_cased_any',
            value: ['estc', 'kibana'],
          },
        ],
      };

      const first = getFoundExceptionListItemSchemaMock();
      first.data[0].entries = testEntries;
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

      const resp = await getFilteredEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        filter: TEST_FILTER,
        listId: ENDPOINT_LIST_ID,
      });
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

      const resp = await getFilteredEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        filter: TEST_FILTER,
        listId: ENDPOINT_LIST_ID,
      });
      expect(resp).toEqual({
        entries: [expectedEndpointExceptions],
      });
    });

    test('it should deduplicate exception items', async () => {
      const testEntries: EntriesArray = [
        { field: 'host.os.full.caseless', operator: 'included', type: 'match', value: 'windows' },
        { field: 'server.ip', operator: 'included', type: 'match', value: '192.168.1.1' },
      ];

      const expectedEndpointExceptions = {
        type: 'simple',
        entries: [
          {
            field: 'host.os.full',
            operator: 'included',
            type: 'exact_caseless',
            value: 'windows',
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

      const resp = await getFilteredEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        filter: TEST_FILTER,
        listId: ENDPOINT_LIST_ID,
      });
      expect(resp).toEqual({
        entries: [expectedEndpointExceptions],
      });
    });

    test('it should ignore unsupported entries', async () => {
      // Lists and exists are not supported by the Endpoint
      const testEntries: EntriesArray = [
        { field: 'host.os.full', operator: 'included', type: 'match', value: 'windows' },
        {
          field: 'host.os.full',
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
            field: 'host.os.full',
            operator: 'included',
            type: 'exact_cased',
            value: 'windows',
          },
        ],
      };

      const first = getFoundExceptionListItemSchemaMock();
      first.data[0].entries = testEntries;
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

      const resp = await getFilteredEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        filter: TEST_FILTER,
        listId: ENDPOINT_LIST_ID,
      });
      expect(resp).toEqual({
        entries: [expectedEndpointExceptions],
      });
    });

    test('it should convert the exception lists response to the proper endpoint format while paging', async () => {
      // The first call returns two exceptions
      const first = getFoundExceptionListItemSchemaMock();
      first.per_page = 2;
      first.total = 4;
      first.data.push(getExceptionListItemSchemaMock());

      // The second call returns two exceptions
      const second = getFoundExceptionListItemSchemaMock();
      second.per_page = 2;
      second.total = 4;
      second.data.push(getExceptionListItemSchemaMock());

      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);

      const resp = await getFilteredEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        filter: TEST_FILTER,
        listId: ENDPOINT_LIST_ID,
      });

      // Expect 2 exceptions, the first two calls returned the same exception list items
      expect(resp.entries.length).toEqual(2);
    });

    test('it should handle no exceptions', async () => {
      const exceptionsResponse = getFoundExceptionListItemSchemaMock();
      exceptionsResponse.data = [];
      exceptionsResponse.total = 0;
      mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(exceptionsResponse);
      const resp = await getFilteredEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        filter: TEST_FILTER,
        listId: ENDPOINT_LIST_ID,
      });
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

      const artifact1 = await buildArtifact(
        translatedExceptionList,
        'v1',
        'linux',
        ArtifactConstants.GLOBAL_ALLOWLIST_NAME
      );
      const artifact2 = await buildArtifact(
        translatedExceptionListReversed,
        'v1',
        'linux',
        ArtifactConstants.GLOBAL_ALLOWLIST_NAME
      );
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

      const artifact1 = await buildArtifact(
        translatedExceptionList,
        'v1',
        'linux',
        ArtifactConstants.GLOBAL_ALLOWLIST_NAME
      );
      const artifact2 = await buildArtifact(
        translatedExceptionListReversed,
        'v1',
        'linux',
        ArtifactConstants.GLOBAL_ALLOWLIST_NAME
      );
      expect(artifact1.decodedSha256).toEqual(artifact2.decodedSha256);
    });
  });

  describe('Endpoint Artifacts', () => {
    const getOsFilter = (os: 'macos' | 'linux' | 'windows') =>
      `exception-list-agnostic.attributes.os_types:"${os} "`;

    describe('linux', () => {
      test('it should add process.name entry when wildcard process.executable entry has filename', async () => {
        const os = 'linux';
        const testEntries: EntriesArray = [
          {
            field: 'process.executable.caseless',
            operator: 'included',
            type: 'wildcard',
            value: '/usr/bi*/doc.md',
          },
        ];

        const expectedEndpointExceptions = {
          type: 'simple',
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'wildcard_cased',
              value: '/usr/bi*/doc.md',
            },
            {
              field: 'process.name',
              operator: 'included',
              type: 'exact_cased',
              value: 'doc.md',
            },
          ],
        };

        const first = getFoundExceptionListItemSchemaMock();
        first.data[0].entries = testEntries;
        first.data[0].os_types = [os];
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

        const resp = await getFilteredEndpointExceptionList({
          elClient: mockExceptionClient,
          schemaVersion: 'v1',
          filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
          listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        });
        expect(resp).toEqual({
          entries: [expectedEndpointExceptions],
        });
      });

      test('it should add file.name entry when wildcard file.path.text entry has filename', async () => {
        const os = 'linux';
        const testEntries: EntriesArray = [
          {
            field: 'file.path.text',
            operator: 'included',
            type: 'wildcard',
            value: '/usr/bi*/doc.md',
          },
        ];

        const expectedEndpointExceptions = {
          type: 'simple',
          entries: [
            {
              field: 'file.path',
              operator: 'included',
              type: 'wildcard_cased',
              value: '/usr/bi*/doc.md',
            },
            {
              field: 'file.name',
              operator: 'included',
              type: 'exact_cased',
              value: 'doc.md',
            },
          ],
        };

        const first = getFoundExceptionListItemSchemaMock();
        first.data[0].entries = testEntries;
        first.data[0].os_types = [os];
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

        const resp = await getFilteredEndpointExceptionList({
          elClient: mockExceptionClient,
          schemaVersion: 'v1',
          filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
          listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        });
        expect(resp).toEqual({
          entries: [expectedEndpointExceptions],
        });
      });

      test('it should not add process.name entry when wildcard process.executable entry has wildcard filename', async () => {
        const os = 'linux';
        const testEntries: EntriesArray = [
          {
            field: 'process.executable.caseless',
            operator: 'included',
            type: 'wildcard',
            value: '/usr/bin/*.md',
          },
        ];

        const expectedEndpointExceptions = {
          type: 'simple',
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'wildcard_cased',
              value: '/usr/bin/*.md',
            },
          ],
        };

        const first = getFoundExceptionListItemSchemaMock();
        first.data[0].entries = testEntries;
        first.data[0].os_types = [os];
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

        const resp = await getFilteredEndpointExceptionList({
          elClient: mockExceptionClient,
          schemaVersion: 'v1',
          filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
          listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        });
        expect(resp).toEqual({
          entries: [expectedEndpointExceptions],
        });
      });

      test('it should not add process.name entry when process.name entry already exists', async () => {
        const os = 'linux';
        const testEntries: EntriesArray = [
          {
            field: 'process.executable.caseless',
            operator: 'included',
            type: 'wildcard',
            value: '/usr/bi*/donotadd.md',
          },
          {
            field: 'process.name',
            operator: 'included',
            type: 'match',
            value: 'appname.exe',
          },
          {
            field: 'process.name',
            operator: 'included',
            type: 'match_any',
            value: ['one.exe', 'two.exe'],
          },
        ];

        const expectedEndpointExceptions = {
          type: 'simple',
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'wildcard_cased',
              value: '/usr/bi*/donotadd.md',
            },
            {
              field: 'process.name',
              operator: 'included',
              type: 'exact_cased',
              value: 'appname.exe',
            },
            {
              field: 'process.name',
              operator: 'included',
              type: 'exact_cased_any',
              value: ['one.exe', 'two.exe'],
            },
          ],
        };

        const first = getFoundExceptionListItemSchemaMock();
        first.data[0].entries = testEntries;
        first.data[0].os_types = [os];

        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

        const resp = await getFilteredEndpointExceptionList({
          elClient: mockExceptionClient,
          schemaVersion: 'v1',
          filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
          listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        });

        expect(resp).toEqual({
          entries: [expectedEndpointExceptions],
        });
      });

      test('it should not add file.name entry when wildcard file.path.text entry has wildcard filename', async () => {
        const os = 'linux';
        const testEntries: EntriesArray = [
          {
            field: 'file.path.text',
            operator: 'included',
            type: 'wildcard',
            value: '/usr/bin/*.md',
          },
        ];

        const expectedEndpointExceptions = {
          type: 'simple',
          entries: [
            {
              field: 'file.path',
              operator: 'included',
              type: 'wildcard_cased',
              value: '/usr/bin/*.md',
            },
          ],
        };

        const first = getFoundExceptionListItemSchemaMock();
        first.data[0].entries = testEntries;
        first.data[0].os_types = [os];
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

        const resp = await getFilteredEndpointExceptionList({
          elClient: mockExceptionClient,
          schemaVersion: 'v1',
          filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
          listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        });
        expect(resp).toEqual({
          entries: [expectedEndpointExceptions],
        });
      });

      test('it should not add file.name entry when file.name entry already exists', async () => {
        const os = 'linux';
        const testEntries: EntriesArray = [
          {
            field: 'file.path.text',
            operator: 'included',
            type: 'wildcard',
            value: '/usr/b*/donotadd.md',
          },
          {
            field: 'file.name',
            operator: 'included',
            type: 'match',
            value: 'filename.app',
          },
          {
            field: 'file.name',
            operator: 'included',
            type: 'match_any',
            value: ['one.app', 'two.app'],
          },
        ];

        const expectedEndpointExceptions = {
          type: 'simple',
          entries: [
            {
              field: 'file.path',
              operator: 'included',
              type: 'wildcard_cased',
              value: '/usr/b*/donotadd.md',
            },
            {
              field: 'file.name',
              operator: 'included',
              type: 'exact_cased',
              value: 'filename.app',
            },
            {
              field: 'file.name',
              operator: 'included',
              type: 'exact_cased_any',
              value: ['one.app', 'two.app'],
            },
          ],
        };

        const first = getFoundExceptionListItemSchemaMock();
        first.data[0].entries = testEntries;
        first.data[0].os_types = [os];

        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

        const resp = await getFilteredEndpointExceptionList({
          elClient: mockExceptionClient,
          schemaVersion: 'v1',
          filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
          listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        });

        expect(resp).toEqual({
          entries: [expectedEndpointExceptions],
        });
      });
    });

    describe('macos/windows', () => {
      test('it should add process.name entry for process.executable entry with wildcard type', async () => {
        const os = Math.floor(Math.random() * 2) === 0 ? 'windows' : 'macos';
        const value = os === 'windows' ? 'C:\\My Doc*\\doc.md' : '/usr/bi*/doc.md';

        const testEntries: EntriesArray = [
          {
            field: 'process.executable.caseless',
            operator: 'included',
            type: 'wildcard',
            value,
          },
        ];

        const expectedEndpointExceptions = {
          type: 'simple',
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'wildcard_caseless',
              value,
            },
            {
              field: 'process.name',
              operator: 'included',
              type: 'exact_caseless',
              value: 'doc.md',
            },
          ],
        };

        const first = getFoundExceptionListItemSchemaMock();
        first.data[0].entries = testEntries;
        first.data[0].os_types = [os];
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

        const resp = await getFilteredEndpointExceptionList({
          elClient: mockExceptionClient,
          schemaVersion: 'v1',
          filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
          listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        });
        expect(resp).toEqual({
          entries: [expectedEndpointExceptions],
        });
      });

      test('it should add file.name entry when wildcard file.path.text entry has filename', async () => {
        const os = Math.floor(Math.random() * 2) === 0 ? 'windows' : 'macos';
        const value = os === 'windows' ? 'C:\\My Doc*\\doc.md' : '/usr/bi*/doc.md';

        const testEntries: EntriesArray = [
          {
            field: 'file.path.text',
            operator: 'included',
            type: 'wildcard',
            value,
          },
        ];

        const expectedEndpointExceptions = {
          type: 'simple',
          entries: [
            {
              field: 'file.path',
              operator: 'included',
              type: 'wildcard_caseless',
              value,
            },
            {
              field: 'file.name',
              operator: 'included',
              type: 'exact_caseless',
              value: 'doc.md',
            },
          ],
        };

        const first = getFoundExceptionListItemSchemaMock();
        first.data[0].entries = testEntries;
        first.data[0].os_types = [os];
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

        const resp = await getFilteredEndpointExceptionList({
          elClient: mockExceptionClient,
          schemaVersion: 'v1',
          filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
          listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        });
        expect(resp).toEqual({
          entries: [expectedEndpointExceptions],
        });
      });

      test('it should not add process.name entry when wildcard process.executable entry has wildcard filename', async () => {
        const os = Math.floor(Math.random() * 2) === 0 ? 'windows' : 'macos';
        const value = os === 'windows' ? 'C:\\My Doc*\\*.md' : '/usr/bin/*.md';

        const testEntries: EntriesArray = [
          {
            field: 'process.executable.caseless',
            operator: 'included',
            type: 'wildcard',
            value,
          },
        ];

        const expectedEndpointExceptions = {
          type: 'simple',
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'wildcard_caseless',
              value,
            },
          ],
        };

        const first = getFoundExceptionListItemSchemaMock();
        first.data[0].entries = testEntries;
        first.data[0].os_types = [os];
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

        const resp = await getFilteredEndpointExceptionList({
          elClient: mockExceptionClient,
          schemaVersion: 'v1',
          filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
          listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        });
        expect(resp).toEqual({
          entries: [expectedEndpointExceptions],
        });
      });

      test('it should not add process.name entry when process.name entry already exists', async () => {
        const os = Math.floor(Math.random() * 2) === 0 ? 'windows' : 'macos';
        const value = os === 'windows' ? 'C:\\My Doc*\\donotadd.md' : '/usr/bin/donotadd.md';

        const testEntries: EntriesArray = [
          {
            field: 'process.executable.caseless',
            operator: 'included',
            type: 'wildcard',
            value,
          },
          {
            field: 'process.name',
            operator: 'included',
            type: 'match',
            value: 'appname.exe',
          },
          {
            field: 'process.name',
            operator: 'included',
            type: 'match_any',
            value: ['one.exe', 'two.exe'],
          },
        ];

        const expectedEndpointExceptions = {
          type: 'simple',
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'wildcard_caseless',
              value,
            },
            {
              field: 'process.name',
              operator: 'included',
              type: 'exact_caseless',
              value: 'appname.exe',
            },
            {
              field: 'process.name',
              operator: 'included',
              type: 'exact_caseless_any',
              value: ['one.exe', 'two.exe'],
            },
          ],
        };

        const first = getFoundExceptionListItemSchemaMock();
        first.data[0].entries = testEntries;
        first.data[0].os_types = [os];

        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

        const resp = await getFilteredEndpointExceptionList({
          elClient: mockExceptionClient,
          schemaVersion: 'v1',
          filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
          listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        });

        expect(resp).toEqual({
          entries: [expectedEndpointExceptions],
        });
      });

      test('it should not add file.name entry when wildcard file.path.text entry has wildcard filename', async () => {
        const os = Math.floor(Math.random() * 2) === 0 ? 'windows' : 'macos';
        const value = os === 'windows' ? 'C:\\My Doc*\\*.md' : '/usr/bin/*.md';
        const testEntries: EntriesArray = [
          {
            field: 'file.path.text',
            operator: 'included',
            type: 'wildcard',
            value,
          },
        ];

        const expectedEndpointExceptions = {
          type: 'simple',
          entries: [
            {
              field: 'file.path',
              operator: 'included',
              type: 'wildcard_caseless',
              value,
            },
          ],
        };

        const first = getFoundExceptionListItemSchemaMock();
        first.data[0].entries = testEntries;
        first.data[0].os_types = [os];
        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

        const resp = await getFilteredEndpointExceptionList({
          elClient: mockExceptionClient,
          schemaVersion: 'v1',
          filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
          listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        });
        expect(resp).toEqual({
          entries: [expectedEndpointExceptions],
        });
      });

      test('it should not add file.name entry when file.name entry already exists', async () => {
        const os = Math.floor(Math.random() * 2) === 0 ? 'windows' : 'macos';
        const value = os === 'windows' ? 'C:\\My Doc*\\donotadd.md' : '/usr/bin/donotadd.md';

        const testEntries: EntriesArray = [
          {
            field: 'file.path.text',
            operator: 'included',
            type: 'wildcard',
            value,
          },
          {
            field: 'file.name',
            operator: 'included',
            type: 'match',
            value: 'filename.app',
          },
          {
            field: 'file.name',
            operator: 'included',
            type: 'match_any',
            value: ['one.app', 'two.app'],
          },
        ];

        const expectedEndpointExceptions = {
          type: 'simple',
          entries: [
            {
              field: 'file.path',
              operator: 'included',
              type: 'wildcard_caseless',
              value,
            },
            {
              field: 'file.name',
              operator: 'included',
              type: 'exact_caseless',
              value: 'filename.app',
            },
            {
              field: 'file.name',
              operator: 'included',
              type: 'exact_caseless_any',
              value: ['one.app', 'two.app'],
            },
          ],
        };

        const first = getFoundExceptionListItemSchemaMock();
        first.data[0].entries = testEntries;
        first.data[0].os_types = [os];

        mockExceptionClient.findExceptionListItem = jest.fn().mockReturnValueOnce(first);

        const resp = await getFilteredEndpointExceptionList({
          elClient: mockExceptionClient,
          schemaVersion: 'v1',
          filter: `${getOsFilter(os)} and (exception-list-agnostic.attributes.tags:"policy:all")`,
          listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        });

        expect(resp).toEqual({
          entries: [expectedEndpointExceptions],
        });
      });
    });
  });

  const TEST_EXCEPTION_LIST_ITEM = {
    entries: [
      {
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
      },
    ],
  };

  describe('Builds proper kuery without policy', () => {
    test('for Endpoint List', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        os: 'windows',
      });

      expect(resp).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_LIST_ID,
        namespaceType: 'agnostic',
        filter: 'exception-list-agnostic.attributes.os_types:"windows"',
        perPage: 100,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });

    test('for Trusted Apps', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        os: 'macos',
        listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
      });

      expect(resp).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        namespaceType: 'agnostic',
        filter:
          'exception-list-agnostic.attributes.os_types:"macos" and (exception-list-agnostic.attributes.tags:"policy:all")',
        perPage: 100,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });

    test('for Event Filters', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        os: 'macos',
        listId: ENDPOINT_EVENT_FILTERS_LIST_ID,
      });

      expect(resp).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_EVENT_FILTERS_LIST_ID,
        namespaceType: 'agnostic',
        filter:
          'exception-list-agnostic.attributes.os_types:"macos" and (exception-list-agnostic.attributes.tags:"policy:all")',
        perPage: 100,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });

    test('for Host Isolation Exceptions', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        os: 'macos',
        listId: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
      });

      expect(resp).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
        namespaceType: 'agnostic',
        filter:
          'exception-list-agnostic.attributes.os_types:"macos" and (exception-list-agnostic.attributes.tags:"policy:all")',
        perPage: 100,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });

    test('for Blocklists', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        os: 'macos',
        listId: ENDPOINT_BLOCKLISTS_LIST_ID,
      });

      expect(resp).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_BLOCKLISTS_LIST_ID,
        namespaceType: 'agnostic',
        filter:
          'exception-list-agnostic.attributes.os_types:"macos" and (exception-list-agnostic.attributes.tags:"policy:all")',
        perPage: 100,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });
  });

  describe('Build proper kuery with policy', () => {
    test('for Trusted Apps', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        os: 'macos',
        policyId: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
        listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
      });

      expect(resp).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        namespaceType: 'agnostic',
        filter:
          'exception-list-agnostic.attributes.os_types:"macos" and ' +
          '(exception-list-agnostic.attributes.tags:"policy:all" or ' +
          'exception-list-agnostic.attributes.tags:"policy:c6d16e42-c32d-4dce-8a88-113cfe276ad1")',
        perPage: 100,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });

    test('for Event Filters', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        os: 'macos',
        policyId: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
        listId: ENDPOINT_EVENT_FILTERS_LIST_ID,
      });

      expect(resp).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_EVENT_FILTERS_LIST_ID,
        namespaceType: 'agnostic',
        filter:
          'exception-list-agnostic.attributes.os_types:"macos" and ' +
          '(exception-list-agnostic.attributes.tags:"policy:all" or ' +
          'exception-list-agnostic.attributes.tags:"policy:c6d16e42-c32d-4dce-8a88-113cfe276ad1")',
        perPage: 100,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });

    test('for Host Isolation Exceptions', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        os: 'macos',
        policyId: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
        listId: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
      });

      expect(resp).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
        namespaceType: 'agnostic',
        filter:
          'exception-list-agnostic.attributes.os_types:"macos" and ' +
          '(exception-list-agnostic.attributes.tags:"policy:all" or ' +
          'exception-list-agnostic.attributes.tags:"policy:c6d16e42-c32d-4dce-8a88-113cfe276ad1")',
        perPage: 100,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });
    test('for Blocklists', async () => {
      mockExceptionClient.findExceptionListItem = jest
        .fn()
        .mockReturnValueOnce(getFoundExceptionListItemSchemaMock());

      const resp = await getEndpointExceptionList({
        elClient: mockExceptionClient,
        schemaVersion: 'v1',
        os: 'macos',
        policyId: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
        listId: ENDPOINT_BLOCKLISTS_LIST_ID,
      });

      expect(resp).toEqual(TEST_EXCEPTION_LIST_ITEM);

      expect(mockExceptionClient.findExceptionListItem).toHaveBeenCalledWith({
        listId: ENDPOINT_BLOCKLISTS_LIST_ID,
        namespaceType: 'agnostic',
        filter:
          'exception-list-agnostic.attributes.os_types:"macos" and ' +
          '(exception-list-agnostic.attributes.tags:"policy:all" or ' +
          'exception-list-agnostic.attributes.tags:"policy:c6d16e42-c32d-4dce-8a88-113cfe276ad1")',
        perPage: 100,
        page: 1,
        sortField: 'created_at',
        sortOrder: 'desc',
      });
    });
  });
});
