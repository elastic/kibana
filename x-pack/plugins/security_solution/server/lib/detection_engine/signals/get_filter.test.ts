/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilter } from './get_filter';
import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getListClientMock } from '@kbn/lists-plugin/server/services/lists/list_client.mock';

describe('get_filter', () => {
  let servicesMock: RuleExecutorServicesMock;
  const listClientMock = getListClientMock();

  beforeAll(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    servicesMock = alertsMock.createRuleExecutorServices();
    servicesMock.savedObjectsClient.get.mockImplementation(async (type: string, id: string) => ({
      id,
      type,
      references: [],
      attributes: {
        query: { query: 'host.name: linux', language: 'kuery' },
        language: 'kuery',
        filters: [],
      },
    }));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getFilter', () => {
    test('returns a query if given a type of query', async () => {
      const { esFilter } = await getFilter({
        type: 'query',
        filters: undefined,
        language: 'kuery',
        query: 'host.name: siem',
        savedId: undefined,
        services: servicesMock,
        index: ['auditbeat-*'],
        lists: [],
        listClient: listClientMock,
      });
      expect(esFilter).toEqual({
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  {
                    match: {
                      'host.name': 'siem',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          should: [],
          must_not: [],
        },
      });
    });

    test('throws on type query if query is undefined', async () => {
      await expect(
        getFilter({
          type: 'query',
          filters: undefined,
          language: undefined,
          query: 'host.name: siem',
          savedId: undefined,
          services: servicesMock,
          index: ['auditbeat-*'],
          lists: [],
          listClient: listClientMock,
        })
      ).rejects.toThrow('query, filters, and index parameter should be defined');
    });

    test('throws on type query if language is undefined', async () => {
      await expect(
        getFilter({
          type: 'query',
          filters: undefined,
          language: 'kuery',
          query: undefined,
          savedId: undefined,
          services: servicesMock,
          index: ['auditbeat-*'],
          lists: [],
          listClient: listClientMock,
        })
      ).rejects.toThrow('query, filters, and index parameter should be defined');
    });

    test('throws on type query if index is undefined', async () => {
      await expect(
        getFilter({
          type: 'query',
          filters: undefined,
          language: 'kuery',
          query: 'host.name: siem',
          savedId: undefined,
          services: servicesMock,
          index: undefined,
          lists: [],
          listClient: listClientMock,
        })
      ).rejects.toThrow('query, filters, and index parameter should be defined');
    });

    test('returns a saved query if given a type of query', async () => {
      const { esFilter } = await getFilter({
        type: 'saved_query',
        filters: undefined,
        language: undefined,
        query: undefined,
        savedId: 'some-id',
        services: servicesMock,
        index: ['auditbeat-*'],
        lists: [],
        listClient: listClientMock,
      });
      expect(esFilter).toEqual({
        bool: {
          filter: [
            { bool: { minimum_should_match: 1, should: [{ match: { 'host.name': 'linux' } }] } },
          ],
          must: [],
          must_not: [],
          should: [],
        },
      });
    });

    test('returns the query persisted to the threat_match rule, despite saved_id being specified', async () => {
      const { esFilter } = await getFilter({
        type: 'threat_match',
        filters: undefined,
        language: 'kuery',
        query: 'host.name: siem',
        savedId: 'some-id',
        services: servicesMock,
        index: ['auditbeat-*'],
        lists: [],
        listClient: listClientMock,
      });
      expect(esFilter).toEqual({
        bool: {
          filter: [
            { bool: { minimum_should_match: 1, should: [{ match: { 'host.name': 'siem' } }] } },
          ],
          must: [],
          must_not: [],
          should: [],
        },
      });
    });

    test('returns the query persisted to the threshold rule, despite saved_id being specified', async () => {
      const { esFilter } = await getFilter({
        type: 'threat_match',
        filters: undefined,
        language: 'kuery',
        query: 'host.name: siem',
        savedId: 'some-id',
        services: servicesMock,
        index: ['auditbeat-*'],
        lists: [],
        listClient: listClientMock,
      });
      expect(esFilter).toEqual({
        bool: {
          filter: [
            { bool: { minimum_should_match: 1, should: [{ match: { 'host.name': 'siem' } }] } },
          ],
          must: [],
          must_not: [],
          should: [],
        },
      });
    });

    test('throws on saved query if saved_id is undefined', async () => {
      await expect(
        getFilter({
          type: 'saved_query',
          filters: undefined,
          language: undefined,
          query: undefined,
          savedId: undefined,
          services: servicesMock,
          index: ['auditbeat-*'],
          lists: [],
          listClient: listClientMock,
        })
      ).rejects.toThrow('savedId parameter should be defined');
    });

    test('throws on saved query if index is undefined', async () => {
      await expect(
        getFilter({
          type: 'saved_query',
          filters: undefined,
          language: undefined,
          query: undefined,
          savedId: 'some-id',
          services: servicesMock,
          index: undefined,
          lists: [],
          listClient: listClientMock,
        })
      ).rejects.toThrow('savedId parameter should be defined');
    });

    test('throws on machine learning query', async () => {
      await expect(
        getFilter({
          type: 'machine_learning',
          filters: undefined,
          language: undefined,
          query: undefined,
          savedId: 'some-id',
          services: servicesMock,
          index: undefined,
          lists: [],
          listClient: listClientMock,
        })
      ).rejects.toThrow('Unsupported Rule of type "machine_learning" supplied to getFilter');
    });

    test('returns a query when given a list', async () => {
      const { esFilter } = await getFilter({
        type: 'query',
        filters: undefined,
        language: 'kuery',
        query: 'host.name: siem',
        savedId: undefined,
        services: servicesMock,
        index: ['auditbeat-*'],
        lists: [getExceptionListItemSchemaMock()],
        listClient: listClientMock,
      });

      expect(esFilter).toEqual({
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  {
                    match: {
                      'host.name': 'siem',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          must_not: [
            {
              bool: {
                should: [
                  {
                    bool: {
                      filter: [
                        {
                          nested: {
                            path: 'some.parentField',
                            query: {
                              bool: {
                                should: [
                                  {
                                    match_phrase: {
                                      'some.parentField.nested.field': 'some value',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                            score_mode: 'none',
                          },
                        },
                        {
                          bool: {
                            should: [
                              {
                                match_phrase: {
                                  'some.not.nested.field': 'some value',
                                },
                              },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
          should: [],
        },
      });
    });
  });
});
