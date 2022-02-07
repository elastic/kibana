/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPercolateQueries } from './create_percolate_queries';
import { mockRuleId, mockRuleVersion } from './mocks';

describe('createPercolateQueries', () => {
  it('creates expected queries when there is a single threat mapping', () => {
    const actual = createPercolateQueries({
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
    });
    expect(actual).toEqual([
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [
            {
              match: { 'host.name': { query: 'computer1' } },
              _name: '100__SEP__threat_index_1__SEP__host.name__SEP__threat.indicator.host.name',
            },
          ],
          minimum_should_match: 1,
        },
        indicator: {
          _id: '100',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                file: { hash: { sha1: 'ece1ece2ece3' } },
                host: { name: 'computer1', ip: '127.0.0.1' },
              },
              feed: { name: 'eceintelligence_feed1' },
            },
          },
        },
      },
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [
            {
              match: { 'host.name': { query: 'computer2' } },
              _name: '101__SEP__threat_index_1__SEP__host.name__SEP__threat.indicator.host.name',
            },
          ],
          minimum_should_match: 1,
        },
        indicator: {
          _id: '101',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                file: { hash: { sha1: 'ece3ece4ece5' } },
                host: { name: 'computer2', ip: '127.0.0.2' },
              },
              feed: { name: 'eceintelligence_feed1' },
            },
          },
        },
      },
    ]);
  });

  it('creates expected queries when there is a single AND clause', () => {
    const actual = createPercolateQueries({
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
                host: {
                  name: 'computer1',
                  ip: '127.0.0.1',
                },
              },
              confidence: 'there is only confidence',
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
    });
    expect(actual).toEqual([
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [
            {
              match: { confidence: { query: 'there is confidence' } },
              _name: '201__SEP__threat_index_1__SEP__confidence__SEP__threat.indicator.confidence',
            },
            {
              match: { description: { query: 'there is description too' } },
              _name:
                '201__SEP__threat_index_1__SEP__description__SEP__threat.indicator.description',
            },
          ],
          minimum_should_match: 2,
        },
        indicator: {
          _id: '201',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                file: { hash: { sha1: 'ece3ece4ece5' } },
                confidence: 'there is confidence',
                description: 'there is description too',
              },
              feed: { name: 'eceintelligence_feed1' },
            },
          },
        },
      },
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [
            {
              match: { confidence: { query: 'another confidence' } },
              _name: '202__SEP__threat_index_1__SEP__confidence__SEP__threat.indicator.confidence',
            },
            {
              match: { description: { query: 'another description' } },
              _name:
                '202__SEP__threat_index_1__SEP__description__SEP__threat.indicator.description',
            },
          ],
          minimum_should_match: 2,
        },
        indicator: {
          _id: '202',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                file: { hash: { sha1: 'ece3ece4ece5' } },
                confidence: 'another confidence',
                description: 'another description',
              },
              feed: { name: 'eceintelligence_feed1' },
            },
          },
        },
      },
    ]);
  });

  it('creates expected queries when there are multiple threat mappings', () => {
    const actual = createPercolateQueries({
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
                host: {
                  name: 'computer1',
                  ip: '127.0.0.1',
                },
              },
              confidence: 'very confident',
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
          should: [
            {
              match: { 'host.name': { query: 'computer1' } },
              _name: '300__SEP__threat_index_1__SEP__host.name__SEP__threat.indicator.host.name',
            },
          ],
          minimum_should_match: 1,
        },
        indicator: {
          _id: '300',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: { host: { name: 'computer1', ip: '127.0.0.1' } },
              confidence: 'very confident',
              feed: { name: 'eceintelligence_feed1' },
            },
          },
        },
      },
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [
            {
              match: { confidence: { query: 'very confident' } },
              _name: '300__SEP__threat_index_1__SEP__confidence__SEP__threat.indicator.confidence',
            },
          ],
          minimum_should_match: 1,
        },
        indicator: {
          _id: '300',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: { host: { name: 'computer1', ip: '127.0.0.1' } },
              confidence: 'very confident',
              feed: { name: 'eceintelligence_feed1' },
            },
          },
        },
      },
      {
        bool: {
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          should: [
            {
              match: { confidence: { query: 'there is confidence' } },
              _name: '301__SEP__threat_index_1__SEP__confidence__SEP__threat.indicator.confidence',
            },
          ],
          minimum_should_match: 1,
        },
        indicator: {
          _id: '301',
          _index: 'threat_index_1',
          _source: {
            threat: {
              indicator: {
                file: { hash: { sha1: 'ece3ece4ece5' } },
                confidence: 'there is confidence',
                description: 'there is description too',
              },
              feed: { name: 'eceintelligence_feed1' },
            },
          },
        },
      },
    ]);
  });
});
