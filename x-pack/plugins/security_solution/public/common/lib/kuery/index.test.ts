/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { convertToBuildEsQuery, escapeKuery } from '.';
import { mockIndexPattern } from '../../mock';

describe('Kuery escape', () => {
  it('should not remove white spaces quotes', () => {
    const value = ' netcat';
    const expected = ' netcat';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape quotes', () => {
    const value = 'I said, "Hello."';
    const expected = 'I said, \\"Hello.\\"';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape special characters', () => {
    const value = `This \\ has (a lot of) <special> characters, don't you *think*? "Yes."`;
    const expected = `This \\ has (a lot of) <special> characters, don't you *think*? \\"Yes.\\"`;
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should NOT escape keywords', () => {
    const value = 'foo and bar or baz not qux';
    const expected = 'foo and bar or baz not qux';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should NOT escape keywords next to each other', () => {
    const value = 'foo and bar or not baz';
    const expected = 'foo and bar or not baz';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should not escape keywords without surrounding spaces', () => {
    const value = 'And this has keywords, or does it not?';
    const expected = 'And this has keywords, or does it not?';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should NOT escape uppercase keywords', () => {
    const value = 'foo AND bar';
    const expected = 'foo AND bar';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape special characters and NOT keywords', () => {
    const value = 'Hello, "world", and <nice> to meet you!';
    const expected = 'Hello, \\"world\\", and <nice> to meet you!';
    expect(escapeKuery(value)).to.be(expected);
  });

  it('should escape newlines and tabs', () => {
    const value = 'This\nhas\tnewlines\r\nwith\ttabs';
    const expected = 'This\\nhas\\tnewlines\\r\\nwith\\ttabs';
    expect(escapeKuery(value)).to.be(expected);
  });
});

describe('convertToBuildEsQuery', () => {
  /**
   * All the fields in this query, except for `@timestamp`,
   * are nested fields https://www.elastic.co/guide/en/elasticsearch/reference/current/nested.html
   *
   * This mix of nested and non-nested fields will be used to verify that:
   * ✅ Nested fields are converted to use the `nested` query syntax
   * ✅ The `nested` query syntax includes the `ignore_unmapped` option
   * ✅ Non-nested fields are NOT converted to the `nested` query syntax
   * ✅ Non-nested fields do NOT include the `ignore_unmapped` option
   */
  const queryWithNestedFields = [
    {
      query:
        '((threat.enrichments: { matched.atomic: a4f87cbcd2a4241da77b6bf0c5d9e8553fec991f } and threat.enrichments: { matched.type: indicator_match_rule } and threat.enrichments: { matched.field: file.hash.md5 }) and (@timestamp : *))',
      language: 'kuery',
    },
  ];

  /** A search bar filter (displayed below the KQL / Lucene search bar ) */
  const filters = [
    {
      meta: {
        alias: null,
        negate: false,
        disabled: false,
        type: 'exists',
        key: '_id',
        value: 'exists',
      },
      query: {
        exists: {
          field: '_id',
        },
      },
    },
  ];

  const config = {
    allowLeadingWildcards: true,
    queryStringOptions: {
      analyze_wildcard: true,
    },
    ignoreFilterIfFieldNotInIndex: false,
    dateFormatTZ: 'Browser',
  };

  it('should, by default, build a query where the `nested` fields syntax includes the `"ignore_unmapped":true` option', () => {
    const [converted, _] = convertToBuildEsQuery({
      config,
      queries: queryWithNestedFields,
      indexPattern: mockIndexPattern,
      filters,
    });

    expect(JSON.parse(converted ?? '')).to.eql({
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
                        // ✅ Nested fields are converted to use the `nested` query syntax
                        nested: {
                          path: 'threat.enrichments',
                          query: {
                            bool: {
                              should: [
                                {
                                  match: {
                                    'threat.enrichments.matched.atomic':
                                      'a4f87cbcd2a4241da77b6bf0c5d9e8553fec991f',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          score_mode: 'none',
                          // ✅ The `nested` query syntax includes the `ignore_unmapped` option
                          ignore_unmapped: true,
                        },
                      },
                      {
                        nested: {
                          path: 'threat.enrichments',
                          query: {
                            bool: {
                              should: [
                                {
                                  match: {
                                    'threat.enrichments.matched.type': 'indicator_match_rule',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          score_mode: 'none',
                          ignore_unmapped: true,
                        },
                      },
                      {
                        nested: {
                          path: 'threat.enrichments',
                          query: {
                            bool: {
                              should: [
                                {
                                  match: {
                                    'threat.enrichments.matched.field': 'file.hash.md5',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          score_mode: 'none',
                          ignore_unmapped: true,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        exists: {
                          // ✅ Non-nested fields are NOT converted to the `nested` query syntax
                          // ✅ Non-nested fields do NOT include the `ignore_unmapped` option
                          field: '@timestamp',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          {
            exists: {
              field: '_id',
            },
          },
        ],
        should: [],
        must_not: [],
      },
    });
  });

  it('should, when the default is overridden, build a query where `nested` fields include the `"ignore_unmapped":false` option', () => {
    const configWithOverride = {
      ...config,
      nestedIgnoreUnmapped: false, // <-- override the default
    };

    const [converted, _] = convertToBuildEsQuery({
      config: configWithOverride,
      queries: queryWithNestedFields,
      indexPattern: mockIndexPattern,
      filters,
    });

    expect(JSON.parse(converted ?? '')).to.eql({
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
                        nested: {
                          path: 'threat.enrichments',
                          query: {
                            bool: {
                              should: [
                                {
                                  match: {
                                    'threat.enrichments.matched.atomic':
                                      'a4f87cbcd2a4241da77b6bf0c5d9e8553fec991f',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          score_mode: 'none',
                          ignore_unmapped: false, // <-- overridden by the config to be false
                        },
                      },
                      {
                        nested: {
                          path: 'threat.enrichments',
                          query: {
                            bool: {
                              should: [
                                {
                                  match: {
                                    'threat.enrichments.matched.type': 'indicator_match_rule',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          score_mode: 'none',
                          ignore_unmapped: false,
                        },
                      },
                      {
                        nested: {
                          path: 'threat.enrichments',
                          query: {
                            bool: {
                              should: [
                                {
                                  match: {
                                    'threat.enrichments.matched.field': 'file.hash.md5',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          score_mode: 'none',
                          ignore_unmapped: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        exists: {
                          field: '@timestamp',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          {
            exists: {
              field: '_id',
            },
          },
        ],
        should: [],
        must_not: [],
      },
    });
  });
});
