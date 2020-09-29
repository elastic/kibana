/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getQueryFilter, buildExceptionFilter, buildEqlSearchRequest } from './get_query_filter';
import { Filter, EsQueryConfig } from 'src/plugins/data/public';
import { getExceptionListItemSchemaMock } from '../../../lists/common/schemas/response/exception_list_item_schema.mock';

describe('get_filter', () => {
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
      const query: Partial<Filter> = {
        query: {
          match_phrase: {
            'host.name': 'siem-windows',
          },
        },
      };

      const exists: Partial<Filter> = {
        exists: {
          field: 'host.hostname',
        },
      } as Partial<Filter>;

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
        [getExceptionListItemSchemaMock()]
      );
      expect(esQuery).toEqual({
        bool: {
          filter: [
            { bool: { minimum_should_match: 1, should: [{ match: { 'host.name': 'linux' } }] } },
          ],
          must: [],
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
                                minimum_should_match: 1,
                                should: [
                                  {
                                    match_phrase: {
                                      'some.parentField.nested.field': 'some value',
                                    },
                                  },
                                ],
                              },
                            },
                            score_mode: 'none',
                          },
                        },
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              {
                                match_phrase: {
                                  'some.not.nested.field': 'some value',
                                },
                              },
                            ],
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

    test('it should work with a list with multiple items', () => {
      const esQuery = getQueryFilter(
        'host.name: linux',
        'kuery',
        [],
        ['auditbeat-*'],
        [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()]
      );
      expect(esQuery).toEqual({
        bool: {
          filter: [
            { bool: { minimum_should_match: 1, should: [{ match: { 'host.name': 'linux' } }] } },
          ],
          must: [],
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
                                minimum_should_match: 1,
                                should: [
                                  {
                                    match_phrase: {
                                      'some.parentField.nested.field': 'some value',
                                    },
                                  },
                                ],
                              },
                            },
                            score_mode: 'none',
                          },
                        },
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              {
                                match_phrase: {
                                  'some.not.nested.field': 'some value',
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      filter: [
                        {
                          nested: {
                            path: 'some.parentField',
                            query: {
                              bool: {
                                minimum_should_match: 1,
                                should: [
                                  {
                                    match_phrase: {
                                      'some.parentField.nested.field': 'some value',
                                    },
                                  },
                                ],
                              },
                            },
                            score_mode: 'none',
                          },
                        },
                        {
                          bool: {
                            minimum_should_match: 1,
                            should: [
                              {
                                match_phrase: {
                                  'some.not.nested.field': 'some value',
                                },
                              },
                            ],
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

    describe('when "excludeExceptions" is false', () => {
      test('it should work with a list', () => {
        const esQuery = getQueryFilter(
          'host.name: linux',
          'kuery',
          [],
          ['auditbeat-*'],
          [getExceptionListItemSchemaMock()],
          false
        );
        expect(esQuery).toEqual({
          bool: {
            filter: [
              { bool: { minimum_should_match: 1, should: [{ match: { 'host.name': 'linux' } }] } },
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
                                  minimum_should_match: 1,
                                  should: [
                                    {
                                      match_phrase: {
                                        'some.parentField.nested.field': 'some value',
                                      },
                                    },
                                  ],
                                },
                              },
                              score_mode: 'none',
                            },
                          },
                          {
                            bool: {
                              minimum_should_match: 1,
                              should: [
                                {
                                  match_phrase: {
                                    'some.not.nested.field': 'some value',
                                  },
                                },
                              ],
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

      test('it should work with a list with multiple items', () => {
        const esQuery = getQueryFilter(
          'host.name: linux',
          'kuery',
          [],
          ['auditbeat-*'],
          [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()],
          false
        );
        expect(esQuery).toEqual({
          bool: {
            filter: [
              { bool: { minimum_should_match: 1, should: [{ match: { 'host.name': 'linux' } }] } },
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
                                  minimum_should_match: 1,
                                  should: [
                                    {
                                      match_phrase: {
                                        'some.parentField.nested.field': 'some value',
                                      },
                                    },
                                  ],
                                },
                              },
                              score_mode: 'none',
                            },
                          },
                          {
                            bool: {
                              minimum_should_match: 1,
                              should: [
                                {
                                  match_phrase: {
                                    'some.not.nested.field': 'some value',
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        filter: [
                          {
                            nested: {
                              path: 'some.parentField',
                              query: {
                                bool: {
                                  minimum_should_match: 1,
                                  should: [
                                    {
                                      match_phrase: {
                                        'some.parentField.nested.field': 'some value',
                                      },
                                    },
                                  ],
                                },
                              },
                              score_mode: 'none',
                            },
                          },
                          {
                            bool: {
                              minimum_should_match: 1,
                              should: [
                                {
                                  match_phrase: {
                                    'some.not.nested.field': 'some value',
                                  },
                                },
                              ],
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
        const esQuery = getQueryFilter('host.name: linux', 'kuery', [], ['auditbeat-*'], [], false);
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

    test('it should work with a nested object queries', () => {
      const esQuery = getQueryFilter(
        'category:{ name:Frank and trusted:true }',
        'kuery',
        [],
        ['auditbeat-*'],
        []
      );
      expect(esQuery).toEqual({
        bool: {
          must: [],
          filter: [
            {
              nested: {
                path: 'category',
                query: {
                  bool: {
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match: {
                                'category.name': 'Frank',
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
                                'category.trusted': true,
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                  },
                },
                score_mode: 'none',
              },
            },
          ],
          should: [],
          must_not: [],
        },
      });
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
  });

  describe('buildExceptionFilter', () => {
    const config: EsQueryConfig = {
      allowLeadingWildcards: true,
      queryStringOptions: { analyze_wildcard: true },
      ignoreFilterIfFieldNotInIndex: false,
      dateFormatTZ: 'Zulu',
    };
    test('it should build a filter without chunking exception items', () => {
      const exceptionFilter = buildExceptionFilter(
        [
          { language: 'kuery', query: 'host.name: linux and some.field: value' },
          { language: 'kuery', query: 'user.name: name' },
        ],
        {
          fields: [],
          title: 'auditbeat-*',
        },
        config,
        true,
        2
      );
      expect(exceptionFilter).toEqual({
        meta: {
          alias: null,
          negate: true,
          disabled: false,
        },
        query: {
          bool: {
            should: [
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
                              'some.field': 'value',
                            },
                          },
                        ],
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
                        'user.name': 'name',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      });
    });

    test('it should properly chunk exception items', () => {
      const exceptionFilter = buildExceptionFilter(
        [
          { language: 'kuery', query: 'host.name: linux and some.field: value' },
          { language: 'kuery', query: 'user.name: name' },
          { language: 'kuery', query: 'file.path: /safe/path' },
        ],
        {
          fields: [],
          title: 'auditbeat-*',
        },
        config,
        true,
        2
      );
      expect(exceptionFilter).toEqual({
        meta: {
          alias: null,
          negate: true,
          disabled: false,
        },
        query: {
          bool: {
            should: [
              {
                bool: {
                  should: [
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
                                    'some.field': 'value',
                                  },
                                },
                              ],
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
                              'user.name': 'name',
                            },
                          },
                        ],
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
                        minimum_should_match: 1,
                        should: [
                          {
                            match: {
                              'file.path': '/safe/path',
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      });
    });
  });

  describe('buildEqlSearchRequest', () => {
    test('should build a basic request with time range', () => {
      const request = buildEqlSearchRequest(
        'process where true',
        ['testindex1', 'testindex2'],
        'now-5m',
        'now',
        100,
        undefined,
        [],
        undefined
      );
      expect(request).toEqual({
        method: 'POST',
        path: `/testindex1,testindex2/_eql/search?allow_no_indices=true`,
        body: {
          size: 100,
          query: 'process where true',
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-5m',
                lte: 'now',
              },
            },
          },
        },
      });
    });

    test('should build a request with timestamp and event category overrides', () => {
      const request = buildEqlSearchRequest(
        'process where true',
        ['testindex1', 'testindex2'],
        'now-5m',
        'now',
        100,
        'event.ingested',
        [],
        'event.other_category'
      );
      expect(request).toEqual({
        method: 'POST',
        path: `/testindex1,testindex2/_eql/search?allow_no_indices=true`,
        event_category_field: 'event.other_category',
        body: {
          size: 100,
          query: 'process where true',
          filter: {
            range: {
              'event.ingested': {
                gte: 'now-5m',
                lte: 'now',
              },
            },
          },
        },
      });
    });

    test('should build a request with exceptions', () => {
      const request = buildEqlSearchRequest(
        'process where true',
        ['testindex1', 'testindex2'],
        'now-5m',
        'now',
        100,
        undefined,
        [getExceptionListItemSchemaMock()],
        undefined
      );
      expect(request).toEqual({
        method: 'POST',
        path: `/testindex1,testindex2/_eql/search?allow_no_indices=true`,
        body: {
          size: 100,
          query: 'process where true',
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-5m',
                lte: 'now',
              },
            },
            bool: {
              must_not: {
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
                                  minimum_should_match: 1,
                                  should: [
                                    {
                                      match_phrase: {
                                        'some.parentField.nested.field': 'some value',
                                      },
                                    },
                                  ],
                                },
                              },
                              score_mode: 'none',
                            },
                          },
                          {
                            bool: {
                              minimum_should_match: 1,
                              should: [
                                {
                                  match_phrase: {
                                    'some.not.nested.field': 'some value',
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      });
    });
  });
});
