/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER, lastValueFrom } from 'rxjs';

import { IScopedClusterClient } from '@kbn/core/server';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../common/constants';

import { getConnectorsSearchResultProvider } from './connectors_search_result_provider';

describe('Enterprise Search - connectors search provider', () => {
  const staticAssetsMock = {
    getPluginAssetHref: (input: string) => `/kbn/${input}`,
  } as any;

  const connectorsSearchResultProvider = getConnectorsSearchResultProvider(staticAssetsMock);

  const connectorNameMap = {
    mssql: {
      id: '101',
      name: 'companyName mssql connector aug 12 2024 rev1.2',
    },
    postgres: { id: '100', name: 'companyName-postgres-connector-all' },
    spaces: { id: '102', name: 'companyName with spaces etc companyName' },
  };

  const mockConnectorResponse = {
    results: [
      { id: connectorNameMap.postgres.id, name: connectorNameMap.postgres.name },
      { id: connectorNameMap.mssql.id, name: connectorNameMap.mssql.name },
      { id: connectorNameMap.spaces.id, name: connectorNameMap.spaces.name },
    ],
  };

  const getConnectorSearchData = (name: keyof typeof connectorNameMap) => ({
    id: connectorNameMap[name].name,
    score: 90,
    title: connectorNameMap[name].name,
    type: 'Connector',
    url: {
      path: `${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}/connectors/${connectorNameMap[name].id}`,
      prependBasePath: true,
    },
    icon: '/kbn/images/connector.svg',
  });

  const mockClient = {
    asCurrentUser: {
      transport: {
        request: jest.fn(),
      },
    },
    asInternalUser: {},
  };
  afterEach(() => {
    jest.clearAllMocks();
  });
  const client = mockClient as unknown as IScopedClusterClient;
  mockClient.asCurrentUser.transport.request.mockResolvedValue(mockConnectorResponse);

  describe('find', () => {
    it('returns formatted results', async () => {
      const results = await lastValueFrom(
        connectorsSearchResultProvider.find(
          { term: 'companyName-postgres-connector-all' },
          {
            aborted$: NEVER,
            maxResults: 100,
            client,
            preference: '',
          },
          {} as any
        )
      );
      expect(results).toEqual([{ ...getConnectorSearchData('postgres'), score: 100 }]);
    });

    it('returns all matched results', async () => {
      const results = await lastValueFrom(
        connectorsSearchResultProvider.find(
          { term: 'companyName' },
          {
            aborted$: NEVER,
            client,
            maxResults: 100,
            preference: '',
          },
          {} as any
        )
      );
      expect(results).toEqual([
        { ...getConnectorSearchData('postgres'), score: 90 },
        { ...getConnectorSearchData('mssql'), score: 90 },
        { ...getConnectorSearchData('spaces'), score: 90 },
      ]);
    });

    it('returns all indices on empty string', async () => {
      const results = await lastValueFrom(
        connectorsSearchResultProvider.find(
          { term: '' },
          {
            aborted$: NEVER,
            client,
            maxResults: 100,
            preference: '',
          },
          {} as any
        )
      );
      expect(results).toHaveLength(0);
    });

    it('respect maximum results', async () => {
      const results = await lastValueFrom(
        connectorsSearchResultProvider.find(
          { term: 'companyName' },
          {
            aborted$: NEVER,
            client,
            maxResults: 1,
            preference: '',
          },
          {} as any
        )
      );
      expect(results).toEqual([{ ...getConnectorSearchData('postgres'), score: 90 }]);
    });

    describe('returns empty results', () => {
      it('when term does not match with created indices', async () => {
        const results = await lastValueFrom(
          connectorsSearchResultProvider.find(
            { term: 'sample' },
            {
              aborted$: NEVER,
              client,
              maxResults: 100,
              preference: '',
            },
            {} as any
          )
        );
        expect(results).toEqual([]);
      });

      it('if client is undefined', async () => {
        const results = await lastValueFrom(
          connectorsSearchResultProvider.find(
            { term: 'sample' },
            {
              aborted$: NEVER,
              client: undefined,
              maxResults: 100,
              preference: '',
            },
            {} as any
          )
        );
        expect(results).toEqual([]);
      });

      it('if tag is specified', async () => {
        const results = await lastValueFrom(
          connectorsSearchResultProvider.find(
            { term: 'search', tags: ['tag'] },
            {
              aborted$: NEVER,
              client,
              maxResults: 100,
              preference: '',
            },
            {} as any
          )
        );
        expect(results).toEqual([]);
      });

      it('if unknown type is specified', async () => {
        const results = await lastValueFrom(
          connectorsSearchResultProvider.find(
            { term: 'search', types: ['tag'] },
            {
              aborted$: NEVER,
              client,
              maxResults: 100,
              preference: '',
            },
            {} as any
          )
        );
        expect(results).toEqual([]);
      });
    });
  });
});
