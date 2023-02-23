/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ENRICHMENT_DESTINATION_PATH } from '../../../../../common/constants';
import { ENRICHMENT_TYPES } from '../../../../../common/cti/constants';
import type { SignalSourceHit } from '../types';

import { getThreatListItemMock } from './build_threat_mapping_filter.mock';
import {
  buildEnrichments,
  groupAndMergeSignalMatches,
  enrichSignalThreatMatchesFromSignalsMap,
} from './enrich_signal_threat_matches';
import { getNamedQueryMock, getSignalHitMock } from './enrich_signal_threat_matches.mock';
import type { ThreatListItem, ThreatMatchNamedQuery } from './types';

describe('groupAndMergeSignalMatches', () => {
  it('returns an empty array if there are no signals', () => {
    expect(groupAndMergeSignalMatches([])).toEqual([]);
  });

  it('returns the same list if there are no duplicates', () => {
    const signals = [getSignalHitMock({ _id: '1' }), getSignalHitMock({ _id: '2' })];
    const expectedSignals = [...signals];
    expect(groupAndMergeSignalMatches(signals)).toEqual(expectedSignals);
  });

  it('deduplicates signals with the same ID', () => {
    const signals = [getSignalHitMock({ _id: '1' }), getSignalHitMock({ _id: '1' })];
    const expectedSignals = [signals[0]];
    expect(groupAndMergeSignalMatches(signals)).toEqual(expectedSignals);
  });

  it('merges the matched_queries of duplicate signals', () => {
    const signals = [
      getSignalHitMock({ _id: '1', matched_queries: ['query1'] }),
      getSignalHitMock({ _id: '1', matched_queries: ['query3', 'query4'] }),
    ];
    const [mergedSignal] = groupAndMergeSignalMatches(signals);
    expect(mergedSignal.matched_queries).toEqual(['query1', 'query3', 'query4']);
  });

  it('does not deduplicate identical named queries on duplicate signals', () => {
    const signals = [
      getSignalHitMock({ _id: '1', matched_queries: ['query1'] }),
      getSignalHitMock({ _id: '1', matched_queries: ['query1', 'query2'] }),
    ];
    const [mergedSignal] = groupAndMergeSignalMatches(signals);
    expect(mergedSignal.matched_queries).toEqual(['query1', 'query1', 'query2']);
  });

  it('merges the matched_queries of multiple signals', () => {
    const signals = [
      getSignalHitMock({ _id: '1', matched_queries: ['query1'] }),
      getSignalHitMock({ _id: '1', matched_queries: ['query3', 'query4'] }),
      getSignalHitMock({ _id: '2', matched_queries: ['query1', 'query2'] }),
      getSignalHitMock({ _id: '2', matched_queries: ['query5', 'query6'] }),
    ];
    const mergedSignals = groupAndMergeSignalMatches(signals);
    expect(mergedSignals.map((signal) => signal.matched_queries)).toEqual([
      ['query1', 'query3', 'query4'],
      ['query1', 'query2', 'query5', 'query6'],
    ]);
  });
});

describe('buildEnrichments', () => {
  let threats: ThreatListItem[];
  let queries: ThreatMatchNamedQuery[];
  let indicatorPath: string;

  beforeEach(() => {
    indicatorPath = 'threat.indicator';
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: {
          event: { dataset: 'abuse.ch', reference: 'https://test.com' },
          threat: {
            indicator: {
              domain: 'domain_1',
              other: 'other_1',
              reference: 'https://test.com',
              type: 'type_1',
            },
          },
        },
      }),
    ];
    queries = [
      getNamedQueryMock({
        id: '123',
        index: 'threat-index',
        field: 'event.field',
        value: 'threat.indicator.domain',
      }),
    ];
  });

  it('returns an empty list if queries is empty', () => {
    const enrichments = buildEnrichments({
      queries: [],
      threats,
      indicatorPath,
    });

    expect(enrichments).toEqual([]);
  });

  it('returns the value of the matched indicator as undefined', () => {
    const [enrichment] = buildEnrichments({
      queries,
      threats,
      indicatorPath,
    });

    expect(get(enrichment, 'matched.atomic')).toEqual(undefined);
  });

  it('does not enrich from other fields in the indicator document', () => {
    const [enrichment] = buildEnrichments({
      queries,
      threats,
      indicatorPath,
    });
    expect(Object.keys(enrichment)).toEqual(['indicator', 'feed', 'matched']);
  });

  it('returns the _id of the matched indicator as matched.id', () => {
    const [enrichment] = buildEnrichments({
      queries,
      threats,
      indicatorPath,
    });

    expect(get(enrichment, 'matched.id')).toEqual('123');
  });

  it('returns the _index of the matched indicator as matched.index', () => {
    const [enrichment] = buildEnrichments({
      queries,
      threats,
      indicatorPath,
    });

    expect(get(enrichment, 'matched.index')).toEqual('threat-index');
  });

  it('returns the field of the matched indicator as matched.field', () => {
    const [enrichment] = buildEnrichments({
      queries,
      threats,
      indicatorPath,
    });

    expect(get(enrichment, 'matched.field')).toEqual('event.field');
  });

  it('returns the type of the enrichment as an indicator match type', () => {
    const [enrichment] = buildEnrichments({
      queries,
      threats,
      indicatorPath,
    });

    expect(get(enrichment, 'matched.type')).toEqual(ENRICHMENT_TYPES.IndicatorMatchRule);
  });

  it('returns enrichments for each provided query', () => {
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: {
          threat: {
            indicator: {
              domain: 'domain_1',
              other: 'other_1',
              reference: 'https://test.com',
              type: 'type_1',
            },
          },
        },
      }),
      getThreatListItemMock({
        _id: '456',
        _source: {
          threat: {
            indicator: {
              domain: 'domain_1',
              other: 'other_1',
              reference: 'https://test2.com',
              type: 'type_1',
            },
          },
        },
      }),
    ];
    queries = [
      getNamedQueryMock({ id: '123', value: 'threat.indicator.domain' }),
      getNamedQueryMock({ id: '456', value: 'threat.indicator.other' }),
      getNamedQueryMock({ id: '456', value: 'threat.indicator.domain' }),
    ];
    const enrichments = buildEnrichments({
      queries,
      threats,
      indicatorPath,
    });

    expect(enrichments).toHaveLength(queries.length);
  });

  it('returns the indicator data specified at threat.indicator by default', () => {
    const enrichments = buildEnrichments({
      queries,
      threats,
      indicatorPath,
    });

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {
          domain: 'domain_1',
          other: 'other_1',
          type: 'type_1',
          reference: 'https://test.com',
        },
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat-index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('returns the indicator data specified at the custom path', () => {
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: {
          'threat.indicator.domain': 'domain_1',
          custom: {
            indicator: {
              path: {
                indicator_field: 'indicator_field_1',
                reference: 'https://test3.com',
                type: 'indicator_type',
              },
            },
          },
        },
      }),
    ];

    const enrichments = buildEnrichments({
      queries,
      threats,
      indicatorPath: 'custom.indicator.path',
    });

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {
          indicator_field: 'indicator_field_1',
          reference: 'https://test3.com',
          type: 'indicator_type',
        },
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat-index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('returns only the match data if indicator field is absent', () => {
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: {},
      }),
    ];

    const enrichments = buildEnrichments({
      queries,
      threats,
      indicatorPath,
    });

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {},
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat-index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('returns only the match data if indicator field is an empty array', () => {
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: { threat: { indicator: [] } },
      }),
    ];

    const enrichments = buildEnrichments({
      queries,
      threats,
      indicatorPath,
    });

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {},
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat-index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('returns data sans atomic from first indicator if indicator field is an array of objects', () => {
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: {
          threat: {
            indicator: [
              { domain: 'foo', reference: 'https://test4.com', type: 'first' },
              { domain: 'bar', reference: 'https://test5.com', type: 'second' },
            ],
          },
        },
      }),
    ];

    const enrichments = buildEnrichments({
      queries,
      threats,
      indicatorPath,
    });

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {
          domain: 'foo',
          reference: 'https://test4.com',
          type: 'first',
        },
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat-index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('throws an error if indicator field is a not an object', () => {
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: {
          threat: {
            indicator: 'not an object',
          },
        },
      }),
    ];

    expect(() =>
      buildEnrichments({
        queries,
        threats,
        indicatorPath,
      })
    ).toThrowError('Expected indicator field to be an object, but found: not an object');
  });

  it('throws an error if indicator field is not an array of objects', () => {
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: {
          threat: {
            indicator: ['not an object'],
          },
        },
      }),
    ];

    expect(() =>
      buildEnrichments({
        queries,
        threats,
        indicatorPath,
      })
    ).toThrowError('Expected indicator field to be an object, but found: not an object');
  });

  it('returns the feed data if it specified', () => {
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: {
          event: { dataset: 'abuse.ch', reference: 'https://test.com' },
          threat: {
            feed: { name: 'feed name' },
            indicator: {
              domain: 'domain_1',
              other: 'other_1',
              reference: 'https://test.com',
              type: 'type_1',
            },
          },
        },
      }),
    ];

    const enrichments = buildEnrichments({
      queries,
      threats,
      indicatorPath,
    });

    expect(enrichments).toEqual([
      {
        feed: {
          name: 'feed name',
        },
        indicator: {
          domain: 'domain_1',
          other: 'other_1',
          reference: 'https://test.com',
          type: 'type_1',
        },
        matched: {
          atomic: undefined,
          field: 'event.field',
          id: '123',
          index: 'threat-index',
          type: 'indicator_match_rule',
        },
      },
    ]);
  });
});

describe('enrichSignalThreatMatchesFromSignalsMap', () => {
  let getMatchedThreats: () => Promise<ThreatListItem[]>;
  let indicatorPath: string;
  let signalsMap = new Map();

  beforeEach(() => {
    indicatorPath = 'threat.indicator';
    getMatchedThreats = async () => [
      getThreatListItemMock({
        _id: '123',
        _source: {
          event: {
            category: 'malware',
          },
          threat: { indicator: { domain: 'domain_1', other: 'other_1', type: 'type_1' } },
        },
      }),
    ];
    signalsMap = new Map([
      [
        'source-id',
        [
          {
            id: '123',
            index: 'indicator_index',
            field: 'event.domain',
            value: 'threat.indicator.domain',
          },
        ],
      ],
    ]);
  });

  it('performs no enrichment if there are no signals', async () => {
    const signals: SignalSourceHit[] = [];
    const enrichedSignals = await enrichSignalThreatMatchesFromSignalsMap(
      signals,
      getMatchedThreats,
      indicatorPath,
      new Map()
    );

    expect(enrichedSignals).toEqual([]);
  });

  it('performs no enrichment if signalsMap empty', async () => {
    const signalHit = getSignalHitMock({
      _source: {
        '@timestamp': 'mocked',
        event: { category: 'malware', domain: 'domain_1' },
        threat: { enrichments: [{ existing: 'indicator' }] },
      },
    });
    const signals: SignalSourceHit[] = [signalHit];
    const enrichedSignals = await enrichSignalThreatMatchesFromSignalsMap(
      signals,
      getMatchedThreats,
      indicatorPath,
      new Map()
    );

    expect(enrichedSignals).toEqual([signalHit]);
  });

  it('preserves existing threat.enrichments objects on signals', async () => {
    const signalHit = getSignalHitMock({
      _id: 'source-id',
      _source: {
        '@timestamp': 'mocked',
        event: { category: 'malware', domain: 'domain_1' },
        threat: { enrichments: [{ existing: 'indicator' }] },
      },
    });
    const signals: SignalSourceHit[] = [signalHit];
    const enrichedSignals = await enrichSignalThreatMatchesFromSignalsMap(
      signals,
      getMatchedThreats,
      indicatorPath,
      signalsMap
    );
    const [enrichedHit] = enrichedSignals;
    const enrichments = get(enrichedHit._source, ENRICHMENT_DESTINATION_PATH);

    expect(enrichments).toEqual([
      { existing: 'indicator' },
      {
        feed: {},
        indicator: {
          domain: 'domain_1',
          other: 'other_1',
          type: 'type_1',
        },
        matched: {
          atomic: 'domain_1',
          id: '123',
          index: 'indicator_index',
          field: 'event.domain',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('provides only match data if the matched threat cannot be found', async () => {
    getMatchedThreats = async () => [];
    const signalHit = getSignalHitMock({
      _id: 'source-id',
    });
    const signals: SignalSourceHit[] = [signalHit];
    const enrichedSignals = await enrichSignalThreatMatchesFromSignalsMap(
      signals,
      getMatchedThreats,
      indicatorPath,
      signalsMap
    );
    const [enrichedHit] = enrichedSignals;
    const enrichments = get(enrichedHit._source, ENRICHMENT_DESTINATION_PATH);

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {},
        matched: {
          atomic: undefined,
          id: '123',
          index: 'indicator_index',
          field: 'event.domain',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('preserves an existing threat.enrichments object on signals', async () => {
    const signalHit = getSignalHitMock({
      _id: 'source-id',
      _source: {
        '@timestamp': 'mocked',
        event: { category: 'virus', domain: 'domain_1' },
        threat: {
          enrichments: [
            { indicator: { existing: 'indicator' } },
            { indicator: { existing: 'indicator2' } },
          ],
        },
      },
    });
    const signals: SignalSourceHit[] = [signalHit];
    const enrichedSignals = await enrichSignalThreatMatchesFromSignalsMap(
      signals,
      getMatchedThreats,
      indicatorPath,
      signalsMap
    );
    const [enrichedHit] = enrichedSignals;
    const enrichments = get(enrichedHit._source, ENRICHMENT_DESTINATION_PATH);

    expect(enrichments).toEqual([
      {
        indicator: { existing: 'indicator' },
      },
      {
        indicator: { existing: 'indicator2' },
      },
      {
        feed: {},
        indicator: {
          domain: 'domain_1',
          other: 'other_1',
          type: 'type_1',
        },
        matched: {
          atomic: 'domain_1',
          id: '123',
          index: 'indicator_index',
          field: 'event.domain',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('throws an error if threat is neither an object nor undefined', async () => {
    const signalHit = getSignalHitMock({
      _source: { '@timestamp': 'mocked', threat: 'whoops' },
    });
    const signals: SignalSourceHit[] = [signalHit];
    await expect(() =>
      enrichSignalThreatMatchesFromSignalsMap(signals, getMatchedThreats, indicatorPath, signalsMap)
    ).rejects.toThrowError('Expected threat field to be an object, but found: whoops');
  });

  it('enriches from a configured indicator path, if specified', async () => {
    signalsMap = new Map([
      [
        'source-id',
        [
          {
            id: '123',
            index: 'custom_index',
            field: 'event.domain',
            value: 'threat.indicator.domain',
          },
        ],
      ],
    ]);

    getMatchedThreats = async () => [
      getThreatListItemMock({
        _id: '123',
        _source: {
          custom_threat: {
            custom_indicator: {
              domain: 'custom_domain',
              other: 'custom_other',
              type: 'custom_type',
            },
          },
        },
      }),
    ];
    const signalHit = getSignalHitMock({
      _id: 'source-id',
      _source: {
        event: {
          domain: 'domain_1',
        },
      },
    });
    const signals: SignalSourceHit[] = [signalHit];
    const enrichedSignals = await enrichSignalThreatMatchesFromSignalsMap(
      signals,
      getMatchedThreats,
      'custom_threat.custom_indicator',
      signalsMap
    );
    const [enrichedHit] = enrichedSignals;
    const enrichments = get(enrichedHit._source, ENRICHMENT_DESTINATION_PATH);

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {
          domain: 'custom_domain',
          other: 'custom_other',
          type: 'custom_type',
        },
        matched: {
          atomic: 'domain_1',
          id: '123',
          index: 'custom_index',
          field: 'event.domain',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('merges duplicate matched signals into a single signal with multiple enrichments', async () => {
    signalsMap = new Map([
      [
        'source-id',
        [
          {
            id: '123',
            index: 'indicator_index',
            field: 'event.domain',
            value: 'threat.indicator.domain',
          },
          {
            id: '456',
            index: 'other_custom_index',
            field: 'event.other',
            value: 'threat.indicator.domain',
          },
        ],
      ],
    ]);

    getMatchedThreats = async () => [
      getThreatListItemMock({
        _id: '123',
        _source: {
          event: { category: 'threat' },
          threat: { indicator: { domain: 'domain_1', other: 'other_1', type: 'type_1' } },
        },
      }),
      getThreatListItemMock({
        _id: '456',
        _source: {
          event: { category: 'bad' },
          threat: { indicator: { domain: 'domain_2', other: 'other_2', type: 'type_2' } },
        },
      }),
    ];
    const signalHit = getSignalHitMock({
      _id: 'source-id',
      _source: {
        event: {
          domain: 'domain_1',
          other: 'test_val',
        },
      },
    });
    const otherSignalHit = getSignalHitMock({
      _id: 'source-id',
      _source: {
        event: {
          domain: 'domain_1',
          other: 'test_val',
        },
      },
    });
    const signals: SignalSourceHit[] = [signalHit, otherSignalHit];
    const enrichedSignals = await enrichSignalThreatMatchesFromSignalsMap(
      signals,
      getMatchedThreats,
      indicatorPath,
      signalsMap
    );
    expect(enrichedSignals).toHaveLength(1);

    const [enrichedHit] = enrichedSignals;
    const enrichments = get(enrichedHit._source, ENRICHMENT_DESTINATION_PATH);

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {
          domain: 'domain_1',
          other: 'other_1',
          type: 'type_1',
        },
        matched: {
          atomic: 'domain_1',
          id: '123',
          index: 'indicator_index',
          field: 'event.domain',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
      {
        feed: {},
        indicator: {
          domain: 'domain_2',
          other: 'other_2',
          type: 'type_2',
        },
        matched: {
          atomic: 'test_val',
          id: '456',
          index: 'other_custom_index',
          field: 'event.other',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });
});
