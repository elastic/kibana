/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createThreatQueries } from './create_percolate_queries';
import { mockRuleId, mockRuleVersion } from './mocks';

describe('createThreatQueries', () => {
  it('creates expected queries when there is a single threat mapping', () => {
    const actual = createThreatQueries({
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      threatMapping: [
        {
          entries: [
            {
              field: 'host.name',
              type: 'mapping',
              value: 'threat.indicator.host.name',
            },
          ],
        },
      ],
      threatList: [
        {
          _id: '100',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                file: {
                  hash: {
                    sha1: 'ece1ece2ece3',
                  },
                },
                host: {
                  name: 'computer1',
                  ip: '127.0.0.1',
                },
              },
              feed: {
                name: 'eceintelligence_feed1',
              },
            },
          },
          fields: {
            'threat.indicator.host.name': ['computer1'],
          },
        },
        {
          _id: '101',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                file: {
                  hash: {
                    sha1: 'ece3ece4ece5',
                  },
                },
                host: {
                  name: 'computer2',
                  ip: '127.0.0.2',
                },
              },
              feed: {
                name: 'eceintelligence_feed1',
              },
            },
          },
          fields: {
            'threat.indicator.host.name': ['computer2'],
          },
        },
        {
          _id: '102',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                file: {
                  hash: {
                    sha1: 'ece3ece4ece5',
                  },
                },
              },
              feed: {
                name: 'eceintelligence_feed1',
              },
            },
          },
          fields: {
            'threat.indicator.file.hash.sha1': ['ece3ece4ece5'],
          },
        },
      ],
      threatIndicatorPath: 'threat.indicator',
    });
    expect(actual).toEqual([
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [{ match: { 'host.name': { query: 'computer1' } } }],
          minimum_should_match: 1,
        },
        enrichments: [
          {
            matched: {
              id: '100',
              index: 'threat_index_1',
              atomic: 'computer1',
              field: 'host.name',
              type: 'indicator_match_rule',
            },
            indicator: {
              file: { hash: { sha1: 'ece1ece2ece3' } },
              host: { name: 'computer1', ip: '127.0.0.1' },
            },
            feed: { name: 'eceintelligence_feed1' },
          },
        ],
      },
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [{ match: { 'host.name': { query: 'computer2' } } }],
          minimum_should_match: 1,
        },
        enrichments: [
          {
            matched: {
              id: '101',
              index: 'threat_index_1',
              atomic: 'computer2',
              field: 'host.name',
              type: 'indicator_match_rule',
            },
            indicator: {
              file: { hash: { sha1: 'ece3ece4ece5' } },
              host: { name: 'computer2', ip: '127.0.0.2' },
            },
            feed: { name: 'eceintelligence_feed1' },
          },
        ],
      },
    ]);
  });

  it('creates expected queries when there is a single AND clause', () => {
    const actual = createThreatQueries({
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      threatMapping: [
        {
          entries: [
            { field: 'confidence', type: 'mapping', value: 'threat.indicator.confidence' },
            { field: 'description', type: 'mapping', value: 'threat.indicator.description' },
          ],
        },
      ],
      threatList: [
        {
          _id: '200',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                confidence: 'there is only confidence',
                host: {
                  name: 'computer1',
                  ip: '127.0.0.1',
                },
              },
              feed: {
                name: 'eceintelligence_feed1',
              },
            },
          },
          fields: {
            'threat.indicator.host.name': ['computer1'],
            'threat.indicator.confidence': ['there is only confidence'],
          },
        },
        {
          _id: '201',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                file: {
                  hash: {
                    sha1: 'ece3ece4ece5',
                  },
                },
                confidence: 'there is confidence',
                description: 'there is description too',
              },
              feed: {
                name: 'eceintelligence_feed1',
              },
            },
          },
          fields: {
            'threat.indicator.host.name': ['computer2'],
            'threat.indicator.confidence': ['there is confidence'],
            'threat.indicator.description': ['there is description too'],
          },
        },
        {
          _id: '202',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                file: {
                  hash: {
                    sha1: 'ece3ece4ece5',
                  },
                },
                confidence: 'another confidence',
                description: 'another description',
              },
              feed: {
                name: 'eceintelligence_feed1',
              },
            },
          },
          fields: {
            'threat.indicator.host.name': ['computer2'],
            'threat.indicator.confidence': ['another confidence'],
            'threat.indicator.description': ['another description'],
          },
        },
        {
          _id: '203',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                file: {
                  hash: {
                    sha1: 'ece3ece4ece5',
                  },
                },
              },
              feed: {
                name: 'eceintelligence_feed1',
              },
            },
          },
          fields: {
            'threat.indicator.host.name': ['computer2'],
          },
        },
      ],
      threatIndicatorPath: 'threat.indicator',
    });

    expect(actual).toEqual([
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [
            { match: { confidence: { query: 'there is confidence' } } },
            { match: { description: { query: 'there is description too' } } },
          ],
          minimum_should_match: 2,
        },
        enrichments: [
          {
            matched: {
              id: '201',
              index: 'threat_index_1',
              atomic: 'there is confidence',
              field: 'confidence',
              type: 'indicator_match_rule',
            },
            indicator: {
              file: { hash: { sha1: 'ece3ece4ece5' } },
              confidence: 'there is confidence',
              description: 'there is description too',
            },
            feed: { name: 'eceintelligence_feed1' },
          },
          {
            matched: {
              id: '201',
              index: 'threat_index_1',
              atomic: 'there is description too',
              field: 'description',
              type: 'indicator_match_rule',
            },
            indicator: {
              file: { hash: { sha1: 'ece3ece4ece5' } },
              confidence: 'there is confidence',
              description: 'there is description too',
            },
            feed: { name: 'eceintelligence_feed1' },
          },
        ],
      },
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [
            { match: { confidence: { query: 'another confidence' } } },
            { match: { description: { query: 'another description' } } },
          ],
          minimum_should_match: 2,
        },
        enrichments: [
          {
            matched: {
              id: '202',
              index: 'threat_index_1',
              atomic: 'another confidence',
              field: 'confidence',
              type: 'indicator_match_rule',
            },
            indicator: {
              file: { hash: { sha1: 'ece3ece4ece5' } },
              confidence: 'another confidence',
              description: 'another description',
            },
            feed: { name: 'eceintelligence_feed1' },
          },
          {
            matched: {
              id: '202',
              index: 'threat_index_1',
              atomic: 'another description',
              field: 'description',
              type: 'indicator_match_rule',
            },
            indicator: {
              file: { hash: { sha1: 'ece3ece4ece5' } },
              confidence: 'another confidence',
              description: 'another description',
            },
            feed: { name: 'eceintelligence_feed1' },
          },
        ],
      },
    ]);
  });

  it('creates expected queries when there are multiple threat mappings', () => {
    const actual = createThreatQueries({
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      threatIndicatorPath: 'threat.indicator',
      threatMapping: [
        {
          entries: [
            {
              field: 'host.name',
              type: 'mapping',
              value: 'threat.indicator.host.name',
            },
          ],
        },
        {
          entries: [{ field: 'confidence', type: 'mapping', value: 'threat.indicator.confidence' }],
        },
      ],
      threatList: [
        {
          _id: '300',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                confidence: 'very confident',
                host: {
                  name: 'computer1',
                  ip: '127.0.0.1',
                },
              },
              feed: {
                name: 'eceintelligence_feed1',
              },
            },
          },
          fields: {
            'threat.indicator.host.name': ['computer1'],
            'threat.indicator.confidence': ['very confident'],
          },
        },
        {
          _id: '301',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                file: {
                  hash: {
                    sha1: 'ece3ece4ece5',
                  },
                },
                confidence: 'there is confidence',
                description: 'there is description too',
              },
              feed: {
                name: 'eceintelligence_feed1',
              },
            },
          },
          fields: {
            'threat.indicator.file.hash.sha1': ['ece3ece4ece5'],
            'threat.indicator.confidence': ['there is confidence'],
            'threat.indicator.description': ['there is description too'],
          },
        },
        {
          _id: '203',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                file: {
                  hash: {
                    sha1: 'ece3ece4ece5',
                  },
                },
                description: 'accurate',
              },
              feed: {
                name: 'eceintelligence_feed1',
              },
            },
          },
          fields: {
            'threat.indicator.description': ['accurate'],
          },
        },
      ],
    });

    expect(actual).toEqual([
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [{ match: { 'host.name': { query: 'computer1' } } }],
          minimum_should_match: 1,
        },
        enrichments: [
          {
            matched: {
              id: '300',
              index: 'threat_index_1',
              atomic: 'computer1',
              field: 'host.name',
              type: 'indicator_match_rule',
            },
            indicator: {
              host: { name: 'computer1', ip: '127.0.0.1' },
              confidence: 'very confident',
            },
            feed: { name: 'eceintelligence_feed1' },
          },
        ],
      },
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [{ match: { confidence: { query: 'very confident' } } }],
          minimum_should_match: 1,
        },
        enrichments: [
          {
            matched: {
              id: '300',
              index: 'threat_index_1',
              atomic: 'very confident',
              field: 'confidence',
              type: 'indicator_match_rule',
            },
            indicator: {
              host: { name: 'computer1', ip: '127.0.0.1' },
              confidence: 'very confident',
            },
            feed: { name: 'eceintelligence_feed1' },
          },
        ],
      },
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [{ match: { confidence: { query: 'there is confidence' } } }],
          minimum_should_match: 1,
        },
        enrichments: [
          {
            matched: {
              id: '301',
              index: 'threat_index_1',
              atomic: 'there is confidence',
              field: 'confidence',
              type: 'indicator_match_rule',
            },
            indicator: {
              file: { hash: { sha1: 'ece3ece4ece5' } },
              confidence: 'there is confidence',
              description: 'there is description too',
            },
            feed: { name: 'eceintelligence_feed1' },
          },
        ],
      },
    ]);
  });

  it('creates expected queries when there are multiple threat mappings and AND clauses', () => {
    const actual = createThreatQueries({
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      threatMapping: [
        {
          entries: [
            {
              field: 'host.name',
              type: 'mapping',
              value: 'threatintel.indicator.host.name',
            },
          ],
        },
        {
          entries: [
            { field: 'confidence', type: 'mapping', value: 'threatintel.indicator.confidence' },
            { field: 'description', type: 'mapping', value: 'threatintel.indicator.description' },
          ],
        },
      ],
      threatList: [
        {
          _id: '300',
          _index: 'threat_index_1',
          _source: {
            threatintel: {
              indicator: {
                host: {
                  name: 'computer1',
                  ip: '127.0.0.1',
                },
                confidence: 'very confident',
              },
            },
          },
          fields: {
            'threatintel.indicator.host.name': ['computer1'],
            'threatintel.indicator.confidence': ['very confident'],
          },
        },
        {
          _id: '301',
          _index: 'threat_index_1',
          _source: {
            threatintel: {
              indicator: {
                file: {
                  hash: {
                    sha1: 'ece3ece4ece5',
                  },
                },
                confidence: 'there is confidence',
                description: 'there is description too',
              },
            },
          },
          fields: {
            'threatintel.indicator.file.hash.sha1': ['ece3ece4ece5'],
            'threatintel.indicator.confidence': ['there is confidence'],
            'threatintel.indicator.description': ['there is description too'],
          },
        },
        {
          _id: '203',
          _index: 'threat_index_1',
          _source: {
            threatintel: {
              indicator: {
                file: {
                  hash: {
                    sha1: 'ece3ece4ece5',
                  },
                },
                description: 'accurate',
              },
            },
          },
          fields: {
            'threatintel.indicator.description': ['accurate'],
          },
        },
      ],
      threatIndicatorPath: 'threatintel.indicator',
    });
    expect(actual).toEqual([
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [
            {
              match: { 'host.name': { query: 'computer1' } },
            },
          ],
          minimum_should_match: 1,
        },
        enrichments: [
          {
            matched: {
              atomic: 'computer1',
              field: 'host.name',
              id: '300',
              index: 'threat_index_1',
              type: 'indicator_match_rule',
            },
            indicator: {
              host: { name: 'computer1', ip: '127.0.0.1' },
              confidence: 'very confident',
            },
            feed: { name: '' },
          },
        ],
      },
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [
            {
              match: { confidence: { query: 'there is confidence' } },
            },
            {
              match: { description: { query: 'there is description too' } },
            },
          ],
          minimum_should_match: 2,
        },
        enrichments: [
          {
            matched: {
              atomic: 'there is confidence',
              field: 'confidence',
              id: '301',
              index: 'threat_index_1',
              type: 'indicator_match_rule',
            },
            indicator: {
              file: { hash: { sha1: 'ece3ece4ece5' } },
              confidence: 'there is confidence',
              description: 'there is description too',
            },
            feed: { name: '' },
          },
          {
            matched: {
              atomic: 'there is description too',
              field: 'description',
              id: '301',
              index: 'threat_index_1',
              type: 'indicator_match_rule',
            },
            indicator: {
              file: { hash: { sha1: 'ece3ece4ece5' } },
              confidence: 'there is confidence',
              description: 'there is description too',
            },
            feed: { name: '' },
          },
        ],
      },
    ]);
  });
});
