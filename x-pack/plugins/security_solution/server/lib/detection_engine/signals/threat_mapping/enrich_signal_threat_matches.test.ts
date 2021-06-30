/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { INDICATOR_DESTINATION_PATH } from '../../../../../common/constants';
import { ENRICHMENT_TYPES } from '../../../../../common/cti/constants';

import { getThreatListItemMock } from './build_threat_mapping_filter.mock';
import {
  buildMatchedIndicator,
  enrichSignalThreatMatches,
  groupAndMergeSignalMatches,
} from './enrich_signal_threat_matches';
import {
  getNamedQueryMock,
  getSignalHitMock,
  getSignalsResponseMock,
} from './enrich_signal_threat_matches.mock';
import { GetMatchedThreats, ThreatListItem, ThreatMatchNamedQuery } from './types';
import { encodeThreatMatchNamedQuery } from './utils';

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

describe('buildMatchedIndicator', () => {
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
          threat: { indicator: { domain: 'domain_1', other: 'other_1', type: 'type_1' } },
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
    const indicators = buildMatchedIndicator({
      queries: [],
      threats,
      indicatorPath,
    });

    expect(indicators).toEqual([]);
  });

  it('returns the value of the matched indicator as matched.atomic', () => {
    const [indicator] = buildMatchedIndicator({
      queries,
      threats,
      indicatorPath,
    });

    expect(get(indicator, 'matched.atomic')).toEqual('domain_1');
  });

  it('returns event values as a part of threat', () => {
    const [indicator] = buildMatchedIndicator({
      queries,
      threats,
      indicatorPath,
    });
    const expectedEvent = threats[0]._source!.event;
    expect(get(indicator, 'event')).toEqual(expectedEvent);
  });

  it('returns the _id of the matched indicator as matched.id', () => {
    const [indicator] = buildMatchedIndicator({
      queries,
      threats,
      indicatorPath,
    });

    expect(get(indicator, 'matched.id')).toEqual('123');
  });

  it('returns the _index of the matched indicator as matched.index', () => {
    const [indicator] = buildMatchedIndicator({
      queries,
      threats,
      indicatorPath,
    });

    expect(get(indicator, 'matched.index')).toEqual('threat-index');
  });

  it('returns the field of the matched indicator as matched.field', () => {
    const [indicator] = buildMatchedIndicator({
      queries,
      threats,
      indicatorPath,
    });

    expect(get(indicator, 'matched.field')).toEqual('event.field');
  });

  it('returns the type of the enrichment as an indicator match type', () => {
    const [indicator] = buildMatchedIndicator({
      queries,
      threats,
      indicatorPath,
    });

    expect(get(indicator, 'matched.type')).toEqual(ENRICHMENT_TYPES.IndicatorMatchRule);
  });

  it('returns indicators for each provided query', () => {
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: {
          event: { reference: 'https://test.com' },
          threat: {
            indicator: { domain: 'domain_1', other: 'other_1', type: 'type_1' },
          },
        },
      }),
      getThreatListItemMock({
        _id: '456',
        _source: {
          event: { reference: 'https://test2.com' },
          threat: { indicator: { domain: 'domain_1', other: 'other_1', type: 'type_1' } },
        },
      }),
    ];
    queries = [
      getNamedQueryMock({ id: '123', value: 'threat.indicator.domain' }),
      getNamedQueryMock({ id: '456', value: 'threat.indicator.other' }),
      getNamedQueryMock({ id: '456', value: 'threat.indicator.domain' }),
    ];
    const indicators = buildMatchedIndicator({
      queries,
      threats,
      indicatorPath,
    });

    expect(indicators).toHaveLength(queries.length);
  });

  it('returns the indicator data specified at threat.indicator by default', () => {
    const indicators = buildMatchedIndicator({
      queries,
      threats,
      indicatorPath,
    });

    expect(indicators).toEqual([
      {
        domain: 'domain_1',
        matched: {
          atomic: 'domain_1',
          id: '123',
          index: 'threat-index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
        other: 'other_1',
        type: 'type_1',
        event: {
          reference: 'https://test.com',
          dataset: 'abuse.ch',
        },
      },
    ]);
  });

  it('returns the indicator data specified at the custom path', () => {
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: {
          event: {
            reference: 'https://test3.com',
          },
          'threat.indicator.domain': 'domain_1',
          custom: {
            indicator: {
              path: {
                indicator_field: 'indicator_field_1',
                type: 'indicator_type',
              },
            },
          },
        },
      }),
    ];

    const indicators = buildMatchedIndicator({
      queries,
      threats,
      indicatorPath: 'custom.indicator.path',
    });

    expect(indicators).toEqual([
      {
        indicator_field: 'indicator_field_1',
        matched: {
          atomic: 'domain_1',
          id: '123',
          index: 'threat-index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
        type: 'indicator_type',
        event: {
          reference: 'https://test3.com',
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

    const indicators = buildMatchedIndicator({
      queries,
      threats,
      indicatorPath,
    });

    expect(indicators).toEqual([
      {
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

    const indicators = buildMatchedIndicator({
      queries,
      threats,
      indicatorPath,
    });

    expect(indicators).toEqual([
      {
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
          event: {
            reference: 'https://test4.com',
          },
          threat: {
            indicator: [
              { domain: 'foo', type: 'first' },
              { domain: 'bar', type: 'second' },
            ],
          },
        },
      }),
    ];

    const indicators = buildMatchedIndicator({
      queries,
      threats,
      indicatorPath,
    });

    expect(indicators).toEqual([
      {
        domain: 'foo',
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat-index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
        type: 'first',
        event: {
          reference: 'https://test4.com',
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
      buildMatchedIndicator({
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
      buildMatchedIndicator({
        queries,
        threats,
        indicatorPath,
      })
    ).toThrowError('Expected indicator field to be an object, but found: not an object');
  });
});

describe('enrichSignalThreatMatches', () => {
  let getMatchedThreats: GetMatchedThreats;
  let matchedQuery: string;
  let indicatorPath: string;

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
    matchedQuery = encodeThreatMatchNamedQuery(
      getNamedQueryMock({
        id: '123',
        index: 'indicator_index',
        field: 'event.field',
        value: 'threat.indicator.domain',
      })
    );
  });

  it('performs no enrichment if there are no signals', async () => {
    const signals = getSignalsResponseMock([]);
    const enrichedSignals = await enrichSignalThreatMatches(
      signals,
      getMatchedThreats,
      indicatorPath
    );

    expect(enrichedSignals.hits.hits).toEqual([]);
  });

  it('preserves existing threat.indicator objects on signals', async () => {
    const signalHit = getSignalHitMock({
      _source: {
        '@timestamp': 'mocked',
        event: { category: 'malware' },
        threat: { indicator: [{ existing: 'indicator' }] },
      },
      matched_queries: [matchedQuery],
    });
    const signals = getSignalsResponseMock([signalHit]);
    const enrichedSignals = await enrichSignalThreatMatches(
      signals,
      getMatchedThreats,
      indicatorPath
    );
    const [enrichedHit] = enrichedSignals.hits.hits;
    const indicators = get(enrichedHit._source, INDICATOR_DESTINATION_PATH);

    expect(indicators).toEqual([
      { existing: 'indicator' },
      {
        domain: 'domain_1',
        matched: {
          atomic: 'domain_1',
          id: '123',
          index: 'indicator_index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
        other: 'other_1',
        type: 'type_1',
        event: {
          category: 'malware',
        },
      },
    ]);
  });

  it('provides only match data if the matched threat cannot be found', async () => {
    getMatchedThreats = async () => [];
    const signalHit = getSignalHitMock({
      matched_queries: [matchedQuery],
    });
    const signals = getSignalsResponseMock([signalHit]);
    const enrichedSignals = await enrichSignalThreatMatches(
      signals,
      getMatchedThreats,
      indicatorPath
    );
    const [enrichedHit] = enrichedSignals.hits.hits;
    const indicators = get(enrichedHit._source, INDICATOR_DESTINATION_PATH);

    expect(indicators).toEqual([
      {
        matched: {
          atomic: undefined,
          id: '123',
          index: 'indicator_index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('preserves an existing threat.indicator object on signals', async () => {
    const signalHit = getSignalHitMock({
      _source: {
        '@timestamp': 'mocked',
        event: { category: 'virus' },
        threat: { indicator: { existing: 'indicator' } },
      },
      matched_queries: [matchedQuery],
    });
    const signals = getSignalsResponseMock([signalHit]);
    const enrichedSignals = await enrichSignalThreatMatches(
      signals,
      getMatchedThreats,
      indicatorPath
    );
    const [enrichedHit] = enrichedSignals.hits.hits;
    const indicators = get(enrichedHit._source, INDICATOR_DESTINATION_PATH);

    expect(indicators).toEqual([
      { existing: 'indicator' },
      {
        domain: 'domain_1',
        matched: {
          atomic: 'domain_1',
          id: '123',
          index: 'indicator_index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
        other: 'other_1',
        type: 'type_1',
        event: {
          category: 'malware',
        },
      },
    ]);
  });

  it('throws an error if threat is neither an object nor undefined', async () => {
    const signalHit = getSignalHitMock({
      _source: { '@timestamp': 'mocked', threat: 'whoops' },
      matched_queries: [matchedQuery],
    });
    const signals = getSignalsResponseMock([signalHit]);
    await expect(() =>
      enrichSignalThreatMatches(signals, getMatchedThreats, indicatorPath)
    ).rejects.toThrowError('Expected threat field to be an object, but found: whoops');
  });

  it('enriches from a configured indicator path, if specified', async () => {
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
    matchedQuery = encodeThreatMatchNamedQuery(
      getNamedQueryMock({
        id: '123',
        index: 'custom_index',
        field: 'event.field',
        value: 'custom_threat.custom_indicator.domain',
      })
    );
    const signalHit = getSignalHitMock({
      matched_queries: [matchedQuery],
    });
    const signals = getSignalsResponseMock([signalHit]);
    const enrichedSignals = await enrichSignalThreatMatches(
      signals,
      getMatchedThreats,
      'custom_threat.custom_indicator'
    );
    const [enrichedHit] = enrichedSignals.hits.hits;
    const indicators = get(enrichedHit._source, INDICATOR_DESTINATION_PATH);

    expect(indicators).toEqual([
      {
        domain: 'custom_domain',
        matched: {
          atomic: 'custom_domain',
          id: '123',
          index: 'custom_index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
        other: 'custom_other',
        type: 'custom_type',
      },
    ]);
  });

  it('merges duplicate matched signals into a single signal with multiple indicators', async () => {
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
      _id: 'signal123',
      matched_queries: [matchedQuery],
    });
    const otherSignalHit = getSignalHitMock({
      _id: 'signal123',
      matched_queries: [
        encodeThreatMatchNamedQuery(
          getNamedQueryMock({
            id: '456',
            index: 'other_custom_index',
            field: 'event.other',
            value: 'threat.indicator.domain',
          })
        ),
      ],
    });
    const signals = getSignalsResponseMock([signalHit, otherSignalHit]);
    const enrichedSignals = await enrichSignalThreatMatches(
      signals,
      getMatchedThreats,
      indicatorPath
    );
    expect(enrichedSignals.hits.total).toEqual(expect.objectContaining({ value: 1 }));
    expect(enrichedSignals.hits.hits).toHaveLength(1);

    const [enrichedHit] = enrichedSignals.hits.hits;
    const indicators = get(enrichedHit._source, INDICATOR_DESTINATION_PATH);

    expect(indicators).toEqual([
      {
        domain: 'domain_1',
        matched: {
          atomic: 'domain_1',
          id: '123',
          index: 'indicator_index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
        event: {
          category: 'threat',
        },
        other: 'other_1',
        type: 'type_1',
      },
      {
        domain: 'domain_2',
        matched: {
          atomic: 'domain_2',
          id: '456',
          index: 'other_custom_index',
          field: 'event.other',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
        event: {
          category: 'bad',
        },
        other: 'other_2',
        type: 'type_2',
      },
    ]);
  });
});
