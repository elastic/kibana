/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import { getThreatListItemMock } from './build_threat_mapping_filter.mock';
import { buildMatchedIndicator, enrichSignalThreatMatches } from './enrich_signal_threat_matches';
import {
  getNamedQueryMock,
  getSignalHitMock,
  getSignalsResponseMock,
} from './enrich_signal_threat_matches.mock';
import { GetMatchedThreats, ThreatListItem, ThreatMatchNamedQuery } from './types';
import { encodeThreatMatchNamedQuery } from './utils';

describe('buildMatchedIndicator', () => {
  let threats: ThreatListItem[];
  let queries: ThreatMatchNamedQuery[];

  beforeEach(() => {
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: {
          threat: { indicator: { domain: 'domain_1', other: 'other_1', type: 'type_1' } },
        },
      }),
    ];
    queries = [getNamedQueryMock({ id: '123', value: 'threat.indicator.domain' })];
  });

  it('returns an empty list if queries is empty', () => {
    const indicators = buildMatchedIndicator({
      queries: [],
      threats,
    });

    expect(indicators).toEqual([]);
  });

  it('returns the value of the matched indicator as matched.atomic', () => {
    const [indicator] = buildMatchedIndicator({
      queries,
      threats,
    });

    expect(get(indicator, 'matched.atomic')).toEqual('domain_1');
  });

  it('returns the field of the matched indicator as matched.field', () => {
    const [indicator] = buildMatchedIndicator({
      queries,
      threats,
    });

    expect(get(indicator, 'matched.field')).toEqual('threat.indicator.domain');
  });

  it('returns the type of the matched indicator as matched.type', () => {
    const [indicator] = buildMatchedIndicator({
      queries,
      threats,
    });

    expect(get(indicator, 'matched.type')).toEqual('type_1');
  });

  it('returns indicators for each provided query', () => {
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: {
          threat: { indicator: { domain: 'domain_1', other: 'other_1', type: 'type_1' } },
        },
      }),
      getThreatListItemMock({
        _id: '456',
        _source: {
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
    });

    expect(indicators).toHaveLength(queries.length);
  });

  it('returns the indicator data the specified at threat.indicator by default', () => {
    const indicators = buildMatchedIndicator({
      queries,
      threats,
    });

    expect(indicators).toEqual([
      {
        domain: 'domain_1',
        matched: {
          atomic: 'domain_1',
          field: 'threat.indicator.domain',
          type: 'type_1',
        },
        other: 'other_1',
        type: 'type_1',
      },
    ]);
  });

  it('returns the indicator data the specified at the custom path', () => {
    threats = [
      getThreatListItemMock({
        _id: '123',
        _source: {
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
      indicatorPath: 'custom.indicator.path',
      queries,
      threats,
    });

    expect(indicators).toEqual([
      {
        indicator_field: 'indicator_field_1',
        matched: {
          atomic: 'domain_1',
          field: 'threat.indicator.domain',
          type: 'indicator_type',
        },
        type: 'indicator_type',
      },
    ]);
  });
});

describe('enrichSignalThreatMatches', () => {
  let getMatchedThreats: GetMatchedThreats;

  beforeEach(() => {
    getMatchedThreats = async () => [
      getThreatListItemMock({
        _id: '123',
        _source: {
          threat: { indicator: { domain: 'domain_1', other: 'other_1', type: 'type_1' } },
        },
      }),
    ];
  });

  it('performs no enrichment if there are no signals', async () => {
    const signals = getSignalsResponseMock([]);
    const enrichedSignals = await enrichSignalThreatMatches(signals, getMatchedThreats);

    expect(enrichedSignals.hits.hits).toEqual([]);
  });

  it('preserves existing threat.indicator objects on signals', async () => {
    const query = encodeThreatMatchNamedQuery(
      getNamedQueryMock({ id: '123', value: 'threat.indicator.domain' })
    );
    const signalHit = getSignalHitMock({
      _source: { '@timestamp': 'mocked', threat: { indicator: [{ existing: 'indicator' }] } },
      matched_queries: [query],
    });
    const signals = getSignalsResponseMock([signalHit]);
    const enrichedSignals = await enrichSignalThreatMatches(signals, getMatchedThreats);
    const [enrichedHit] = enrichedSignals.hits.hits;
    const indicators = get(enrichedHit._source, 'threat.indicator');

    expect(indicators).toEqual([
      { existing: 'indicator' },
      {
        domain: 'domain_1',
        matched: { atomic: 'domain_1', field: 'threat.indicator.domain', type: 'type_1' },
        other: 'other_1',
        type: 'type_1',
      },
    ]);
  });

  it.skip('preserves an existing threat.indicator object on signals', async () => {
    const query = encodeThreatMatchNamedQuery(
      getNamedQueryMock({ id: '123', value: 'threat.indicator.domain' })
    );
    const signalHit = getSignalHitMock({
      _source: { '@timestamp': 'mocked', threat: { indicator: { existing: 'indicator' } } },
      matched_queries: [query],
    });
    const signals = getSignalsResponseMock([signalHit]);
    const enrichedSignals = await enrichSignalThreatMatches(signals, getMatchedThreats);
    const [enrichedHit] = enrichedSignals.hits.hits;
    const indicators = get(enrichedHit._source, 'threat.indicator');

    expect(indicators).toEqual([
      { existing: 'indicator' },
      {
        domain: 'domain_1',
        matched: { atomic: 'domain_1', field: 'threat.indicator.domain', type: 'type_1' },
        other: 'other_1',
        type: 'type_1',
      },
    ]);
  });

  it('merges duplicate matched signals into a single signal with multiple indicators', async () => {
    getMatchedThreats = async () => [
      getThreatListItemMock({
        _id: '123',
        _source: {
          threat: { indicator: { domain: 'domain_1', other: 'other_1', type: 'type_1' } },
        },
      }),
      getThreatListItemMock({
        _id: '456',
        _source: {
          threat: { indicator: { domain: 'domain_2', other: 'other_2', type: 'type_2' } },
        },
      }),
    ];
    const query = encodeThreatMatchNamedQuery(
      getNamedQueryMock({ id: '123', value: 'threat.indicator.domain' })
    );
    const otherQuery = encodeThreatMatchNamedQuery(
      getNamedQueryMock({ id: '456', value: 'threat.indicator.domain' })
    );
    const signalHit = getSignalHitMock({
      _id: 'signal123',
      matched_queries: [query],
    });
    const otherSignalHit = getSignalHitMock({
      _id: 'signal123',
      matched_queries: [otherQuery],
    });
    const signals = getSignalsResponseMock([signalHit, otherSignalHit]);
    const enrichedSignals = await enrichSignalThreatMatches(signals, getMatchedThreats);
    expect(enrichedSignals.hits.hits).toHaveLength(1);

    const [enrichedHit] = enrichedSignals.hits.hits;
    const indicators = get(enrichedHit._source, 'threat.indicator');

    expect(indicators).toEqual([
      { existing: 'indicator' },
      {
        domain: 'domain_1',
        matched: { atomic: 'domain_1', field: 'threat.indicator.domain', type: 'type_1' },
        other: 'other_1',
        type: 'type_1',
      },
    ]);
  });
});
