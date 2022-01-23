/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import isEqual from 'lodash/isEqual';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  createEnrichmentFromPercolatorHit,
  enrichEvent,
  enrichEvents,
  getMatchedFromId,
  mergeDuplicates,
} from './enrich_events';
import {
  duplicateEventHitWithEnrichment,
  sampleChunkedSourceEventHits,
  sampleEnrichment,
  sampleEnrichment2,
  sampleEventHit,
  sampleEventHitWithEnrichment,
  sampleEventHitWithThreat,
  sampleIndicatorHit,
  sampleIndicatorHit2,
  sampleLegacyPercolatorHit,
  samplePercolatorHit,
  uniqueEventHitWithEnrichment,
} from './mocks';

describe('enrichEvents', () => {
  it('getMatchedFromId returns expected object', () => {
    const expected = {
      atomic: 'ece123ece345ece678',
      field: 'file.hash.md5',
      id: '13371337',
      index: 'test-index',
      type: 'indicator_match_rule',
    };

    const actual = getMatchedFromId(sampleIndicatorHit);

    expect(isEqual(expected, actual)).toEqual(true);
  });

  it('createEnrichmentFromPercolatorHit creates the expected enrichment', () => {
    const actualEnrichment = createEnrichmentFromPercolatorHit(
      samplePercolatorHit,
      'threat.indicator'
    );

    expect(actualEnrichment).toEqual({
      matched: {
        atomic: '61.54.61.255',
        field: 'destination.ip',
        id: '123',
        index: 'threat_index',
        type: 'indicator_match_rule',
      },
      indicator: {
        reference: 'https://urlhaus.abuse.ch/url/1996847/',
        first_seen: '2022-01-22T00:45:06.000Z',
        provider: 'geenensp',
        ip: '61.54.61.255',
        type: 'url',
        url: {
          path: '/bin.sh',
          extension: 'sh',
          original: 'http://61.54.61.255:42050/bin.sh',
          scheme: 'http',
          port: 42050,
          domain: '61.54.61.255',
          full: 'http://61.54.61.255:42050/bin.sh',
        },
      },
      feed: { name: "Ece's Threat Feed", dashboard_id: '3456-3456-3456' },
    });
  });

  it('createEnrichmentFromPercolatorHit creates the expected enrichment from legacy hit', () => {
    const actualEnrichment = createEnrichmentFromPercolatorHit(
      sampleLegacyPercolatorHit,
      'threatintel.indicator'
    );

    expect(actualEnrichment).toEqual({
      matched: {
        atomic: '61.54.61.255',
        field: 'destination.ip',
        id: '123',
        index: 'threat_index',
        type: 'indicator_match_rule',
      },
      indicator: {
        reference: 'https://urlhaus.abuse.ch/url/1996847/',
        first_seen: '2022-01-22T00:45:06.000Z',
        provider: 'geenensp',
        ip: '61.54.61.255',
        type: 'url',
        url: {
          path: '/bin.sh',
          extension: 'sh',
          original: 'http://61.54.61.255:42050/bin.sh',
          scheme: 'http',
          port: 42050,
          domain: '61.54.61.255',
          full: 'http://61.54.61.255:42050/bin.sh',
        },
      },
    });
  });

  describe('enrichEvent', () => {
    it('enriches event with no threats', () => {
      const actual = enrichEvent({ ...sampleEventHit }, sampleEnrichment);
      expect(
        isEqual(
          {
            ...sampleEventHit,
            _source: {
              ...sampleEventHit._source,
              threat: {
                enrichments: [sampleEnrichment],
              },
            },
          },
          actual
        )
      ).toEqual(true);
    });

    it('enriches event with threats', () => {
      const actual = enrichEvent({ ...sampleEventHitWithThreat }, sampleEnrichment);

      expect(
        isEqual(
          {
            ...sampleEventHitWithThreat,
            _source: {
              ...sampleEventHitWithThreat._source,
              threat: {
                ...sampleEventHitWithThreat._source.threat,
                enrichments: [sampleEnrichment],
              },
            },
          },
          actual
        )
      ).toEqual(true);
    });

    it('enriches event with enrichments', () => {
      const actual = enrichEvent({ ...sampleEventHitWithEnrichment }, sampleEnrichment);
      expect(
        isEqual(
          {
            ...sampleEventHitWithEnrichment,
            _source: {
              ...sampleEventHitWithEnrichment._source,
              threat: {
                ...sampleEventHitWithThreat._source.threat,
                enrichments: [
                  ...sampleEventHitWithEnrichment._source.threat.enrichments,
                  sampleEnrichment,
                ],
              },
            },
          },
          actual
        )
      ).toEqual(true);
    });
  });

  it('mergeDuplicates merges duplicate events enrichments', () => {
    expect(sampleEventHitWithEnrichment._source.threat.enrichments[0]).toEqual(sampleEnrichment);
    expect(duplicateEventHitWithEnrichment._source.threat.enrichments[0]).toEqual(
      sampleEnrichment2
    );
    expect(uniqueEventHitWithEnrichment._source.threat.enrichments[0]).toEqual(sampleEnrichment);

    const result = mergeDuplicates([
      sampleEventHitWithEnrichment,
      duplicateEventHitWithEnrichment,
      uniqueEventHitWithEnrichment,
    ]);

    expect(result.length).toEqual(2);
    expect(result[0]._source.threat.enrichments.length).toEqual(2);
    expect(result[1]._source.threat.enrichments.length).toEqual(1);
    expect(result[0]._source.threat.enrichments[0]).toEqual(sampleEnrichment);
    expect(result[0]._source.threat.enrichments[1]).toEqual(sampleEnrichment2);
    expect(result[1]._source.threat.enrichments).toEqual([sampleEnrichment]);
  });

  it('enriches events', () => {
    const percolatorResponses = [
      {
        hits: {
          hits: [
            {
              ...sampleIndicatorHit,
              fields: { _percolator_document_slot: [0] },
            },
            {
              ...sampleIndicatorHit2,
              fields: { _percolator_document_slot: [0] },
            },
          ],
        },
      },
      {
        hits: {
          hits: [{ ...sampleIndicatorHit2, fields: { _percolator_document_slot: [1, 2] } }],
        },
      },
    ] as unknown as Array<estypes.SearchResponse<unknown, unknown>>;

    const enrichedEvents = enrichEvents({
      chunkedSourceEventHits: sampleChunkedSourceEventHits,
      percolatorResponses,
      threatIndicatorPath: 'threat.indicator',
    });

    // was unable to compare properly even with isEqual and got phantom fails, not sure why
    expect(JSON.stringify(enrichedEvents[0])).toEqual(
      JSON.stringify({
        _id: '1',
        _index: 'events-1',
        _source: {
          existingMockField: 1,
          threat: {
            enrichments: [
              {
                matched: {
                  atomic: 'ece123ece345ece678',
                  field: 'file.hash.md5',
                  id: '13371337',
                  index: 'test-index',
                  type: 'indicator_match_rule',
                },
                indicator: { file: { hash: { md5: 'ece123ece345ece678' } } },
              },
              {
                matched: {
                  atomic: "Ece's MacBook",
                  field: 'destination.name',
                  id: '99999999',
                  index: 'test-index2',
                  type: 'indicator_match_rule',
                },
              },
            ],
          },
        },
      })
    );

    expect(JSON.stringify(enrichedEvents[1])).toEqual(
      JSON.stringify({
        _id: '1002',
        _index: 'events-2',
        _source: {
          existingMockField: 5,
          threat: {
            enrichments: [
              {
                matched: {
                  atomic: "Ece's MacBook",
                  field: 'destination.name',
                  id: '99999999',
                  index: 'test-index2',
                  type: 'indicator_match_rule',
                },
              },
            ],
          },
        },
      })
    );

    expect(JSON.stringify(enrichedEvents[2])).toEqual(
      JSON.stringify({
        _id: '1003',
        _index: 'events-2',
        _source: {
          existingMockField: 6,
          threat: {
            enrichments: [
              {
                matched: {
                  atomic: "Ece's MacBook",
                  field: 'destination.name',
                  id: '99999999',
                  index: 'test-index2',
                  type: 'indicator_match_rule',
                },
              },
            ],
          },
        },
      })
    );
  });
});
