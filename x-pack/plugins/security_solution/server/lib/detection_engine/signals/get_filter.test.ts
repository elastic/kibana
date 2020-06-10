/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getQueryFilter, getFilter } from './get_filter';
import { PartialFilter } from '../types';
import { alertsMock, AlertServicesMock } from '../../../../../alerts/server/mocks';

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

  describe('getQueryFilter', () => {
    test('it should work with an empty filter as kuery', () => {
      const esQuery = getQueryFilter('host.name: linux', 'kuery', [], ['auditbeat-*'], []);
      expect(esQuery).toEqual({
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  {
                    match: {
                      'host.name': 'linux',
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

    test('it should work with an empty filter as lucene', () => {
      const esQuery = getQueryFilter('host.name: linux', 'lucene', [], ['auditbeat-*'], []);
      expect(esQuery).toEqual({
        bool: {
          must: [
            {
              query_string: {
                query: 'host.name: linux',
                analyze_wildcard: true,
                time_zone: 'Zulu',
              },
            },
          ],
          filter: [],
          should: [],
          must_not: [],
        },
      });
    });

    test('it should work with a simple filter as a kuery', () => {
      const esQuery = getQueryFilter(
        'host.name: windows',
        'kuery',
        [
          {
            meta: {
              alias: 'custom label here',
              disabled: false,
              key: 'host.name',
              negate: false,
              params: {
                query: 'siem-windows',
              },
              type: 'phrase',
            },
            query: {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          },
        ],
        ['auditbeat-*'],
        []
      );
      expect(esQuery).toEqual({
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  {
                    match: {
                      'host.name': 'windows',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          ],
          should: [],
          must_not: [],
        },
      });
    });

    test('it should work with a simple filter as a kuery without meta information', () => {
      const esQuery = getQueryFilter(
        'host.name: windows',
        'kuery',
        [
          {
            query: {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          },
        ],
        ['auditbeat-*'],
        []
      );
      expect(esQuery).toEqual({
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  {
                    match: {
                      'host.name': 'windows',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          ],
          should: [],
          must_not: [],
        },
      });
    });

    test('it should work with a simple filter as a kuery without meta information with an exists', () => {
      const query: PartialFilter = {
        query: {
          match_phrase: {
            'host.name': 'siem-windows',
          },
        },
      } as PartialFilter;

      const exists: PartialFilter = {
        exists: {
          field: 'host.hostname',
        },
      } as PartialFilter;

      const esQuery = getQueryFilter(
        'host.name: windows',
        'kuery',
        [query, exists],
        ['auditbeat-*'],
        []
      );
      expect(esQuery).toEqual({
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  {
                    match: {
                      'host.name': 'windows',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
            {
              exists: {
                field: 'host.hostname',
              },
            },
          ],
          should: [],
          must_not: [],
        },
      });
    });

    test('it should work with a simple filter that is disabled as a kuery', () => {
      const esQuery = getQueryFilter(
        'host.name: windows',
        'kuery',
        [
          {
            meta: {
              alias: 'custom label here',
              disabled: true,
              key: 'host.name',
              negate: false,
              params: {
                query: 'siem-windows',
              },
              type: 'phrase',
            },
            query: {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          },
        ],
        ['auditbeat-*'],
        []
      );
      expect(esQuery).toEqual({
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  {
                    match: {
                      'host.name': 'windows',
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

    test('it should work with a simple filter as a lucene', () => {
      const esQuery = getQueryFilter(
        'host.name: windows',
        'lucene',
        [
          {
            meta: {
              alias: 'custom label here',
              disabled: false,
              key: 'host.name',
              negate: false,
              params: {
                query: 'siem-windows',
              },
              type: 'phrase',
            },
            query: {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          },
        ],
        ['auditbeat-*'],
        []
      );
      expect(esQuery).toEqual({
        bool: {
          must: [
            {
              query_string: {
                query: 'host.name: windows',
                analyze_wildcard: true,
                time_zone: 'Zulu',
              },
            },
          ],
          filter: [
            {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          ],
          should: [],
          must_not: [],
        },
      });
    });

    test('it should work with a simple filter that is disabled as a lucene', () => {
      const esQuery = getQueryFilter(
        'host.name: windows',
        'lucene',
        [
          {
            meta: {
              alias: 'custom label here',
              disabled: true,
              key: 'host.name',
              negate: false,
              params: {
                query: 'siem-windows',
              },
              type: 'phrase',
            },
            query: {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          },
        ],
        ['auditbeat-*'],
        []
      );
      expect(esQuery).toEqual({
        bool: {
          must: [
            {
              query_string: {
                query: 'host.name: windows',
                analyze_wildcard: true,
                time_zone: 'Zulu',
              },
            },
          ],
          filter: [],
          should: [],
          must_not: [],
        },
      });
    });

    test('it should work with a list', () => {
      const esQuery = getQueryFilter(
        'host.name: linux',
        'kuery',
        [],
        ['auditbeat-*'],
        [
          {
            field: 'event.module',
            values_operator: 'excluded',
            values_type: 'match',
            values: [
              {
                name: 'suricata',
              },
            ],
          },
        ]
      );
      expect(esQuery).toEqual({
        bool: {
          filter: [
            {
              bool: {
                filter: [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          match: {
                            'host.name': 'linux',
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          match: {
                            'event.module': 'suricata',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
          must: [],
          must_not: [],
          should: [],
        },
      });
    });

    test('it should work with an empty list', () => {
      const esQuery = getQueryFilter('host.name: linux', 'kuery', [], ['auditbeat-*'], []);
      expect(esQuery).toEqual({
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

    test('it should work when lists has value undefined', () => {
      const esQuery = getQueryFilter('host.name: linux', 'kuery', [], ['auditbeat-*'], undefined);
      expect(esQuery).toEqual({
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
  });

  describe('getFilter', () => {
    test('returns a query if given a type of query', async () => {
      const filter = await getFilter({
        type: 'query',
        filters: undefined,
        language: 'kuery',
        query: 'host.name: siem',
        savedId: undefined,
        services: servicesMock,
        index: ['auditbeat-*'],
        lists: undefined,
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
          savedId: undefined,
          services: servicesMock,
          index: ['auditbeat-*'],
          lists: undefined,
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
          lists: undefined,
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
          lists: undefined,
        })
      ).rejects.toThrow('query, filters, and index parameter should be defined');
    });

    test('returns a saved query if given a type of query', async () => {
      const filter = await getFilter({
        type: 'saved_query',
        filters: undefined,
        language: undefined,
        query: undefined,
        savedId: 'some-id',
        services: servicesMock,
        index: ['auditbeat-*'],
        lists: undefined,
      });
      expect(filter).toEqual({
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
          lists: undefined,
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
          lists: undefined,
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
          lists: undefined,
        })
      ).rejects.toThrow('Unsupported Rule of type "machine_learning" supplied to getFilter');
    });

    test('it works with references and does not add indexes', () => {
      const esQuery = getQueryFilter(
        '(event.module:suricata and event.kind:alert) and suricata.eve.alert.signature_id: (2610182 or 2610183 or 2610184 or 2610185 or 2610186 or 2610187)',
        'kuery',
        [],
        ['my custom index'],
        []
      );
      expect(esQuery).toEqual({
        bool: {
          must: [],
          filter: [
            {
              bool: {
                filter: [
                  {
                    bool: {
                      filter: [
                        {
                          bool: {
                            should: [{ match: { 'event.module': 'suricata' } }],
                            minimum_should_match: 1,
                          },
                        },
                        {
                          bool: {
                            should: [{ match: { 'event.kind': 'alert' } }],
                            minimum_should_match: 1,
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      should: [
                        {
                          bool: {
                            should: [{ match: { 'suricata.eve.alert.signature_id': 2610182 } }],
                            minimum_should_match: 1,
                          },
                        },
                        {
                          bool: {
                            should: [
                              {
                                bool: {
                                  should: [
                                    { match: { 'suricata.eve.alert.signature_id': 2610183 } },
                                  ],
                                  minimum_should_match: 1,
                                },
                              },
                              {
                                bool: {
                                  should: [
                                    {
                                      bool: {
                                        should: [
                                          { match: { 'suricata.eve.alert.signature_id': 2610184 } },
                                        ],
                                        minimum_should_match: 1,
                                      },
                                    },
                                    {
                                      bool: {
                                        should: [
                                          {
                                            bool: {
                                              should: [
                                                {
                                                  match: {
                                                    'suricata.eve.alert.signature_id': 2610185,
                                                  },
                                                },
                                              ],
                                              minimum_should_match: 1,
                                            },
                                          },
                                          {
                                            bool: {
                                              should: [
                                                {
                                                  bool: {
                                                    should: [
                                                      {
                                                        match: {
                                                          'suricata.eve.alert.signature_id': 2610186,
                                                        },
                                                      },
                                                    ],
                                                    minimum_should_match: 1,
                                                  },
                                                },
                                                {
                                                  bool: {
                                                    should: [
                                                      {
                                                        match: {
                                                          'suricata.eve.alert.signature_id': 2610187,
                                                        },
                                                      },
                                                    ],
                                                    minimum_should_match: 1,
                                                  },
                                                },
                                              ],
                                              minimum_should_match: 1,
                                            },
                                          },
                                        ],
                                        minimum_should_match: 1,
                                      },
                                    },
                                  ],
                                  minimum_should_match: 1,
                                },
                              },
                            ],
                            minimum_should_match: 1,
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
          should: [],
          must_not: [],
        },
      });
    });

    test('returns a query when given a list', async () => {
      const filter = await getFilter({
        type: 'query',
        filters: undefined,
        language: 'kuery',
        query: 'host.name: siem',
        savedId: undefined,
        services: servicesMock,
        index: ['auditbeat-*'],
        lists: [
          {
            field: 'event.module',
            values_operator: 'excluded',
            values_type: 'match',
            values: [
              {
                name: 'suricata',
              },
            ],
          },
        ],
      });
      expect(filter).toEqual({
        bool: {
          filter: [
            {
              bool: {
                filter: [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          match: {
                            'host.name': 'siem',
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          match: {
                            'event.module': 'suricata',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
          must: [],
          must_not: [],
          should: [],
        },
      });
    });
  });
});
