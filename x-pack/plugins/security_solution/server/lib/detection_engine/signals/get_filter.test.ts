/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilter } from './get_filter';
import { alertsMock, AlertServicesMock } from '../../../../../alerting/server/mocks';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';

describe('get_filter', () => {
  let servicesMock: AlertServicesMock;

  beforeAll(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    servicesMock = alertsMock.createAlertServices();
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
      const filter = await getFilter({
        type: 'query',
        filters: undefined,
        language: 'kuery',
        query: 'host.name: siem',
        index: ['auditbeat-*'],
        lists: [],
      });
      expect(filter).toEqual({
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
          index: ['auditbeat-*'],
          lists: [],
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
          index: ['auditbeat-*'],
          lists: [],
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
          index: undefined,
          lists: [],
        })
      ).rejects.toThrow('query, filters, and index parameter should be defined');
    });

    test('throws on machine learning query', async () => {
      await expect(
        getFilter({
          type: 'machine_learning',
          filters: undefined,
          language: undefined,
          query: undefined,
          index: undefined,
          lists: [],
        })
      ).rejects.toThrow('Unsupported Rule of type "machine_learning" supplied to getFilter');
    });

    test('returns a query when given a list', async () => {
      const filter = await getFilter({
        type: 'query',
        filters: undefined,
        language: 'kuery',
        query: 'host.name: siem',
        index: ['auditbeat-*'],
        lists: [getExceptionListItemSchemaMock()],
      });

      expect(filter).toEqual({
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
