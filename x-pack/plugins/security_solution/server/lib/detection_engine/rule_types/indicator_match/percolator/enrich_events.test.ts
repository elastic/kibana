/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { enrichEvents } from './enrich_events';
import { ThreatEnrichment } from '../../../signals/threat_mapping/types';

describe('enrichEvents', () => {
  it('enriches events', () => {
    const percolatorResponse = {
      hits: {
        hits: [
          {
            _source: {
              threat: {
                enrichments: [
                  {
                    matched: {
                      id: 'HdmY0yLld01',
                      index: 'test-index',
                      atomic: "Ece's computer",
                      field: 'host.name',
                      type: 'indicator_match_rule',
                    },
                    indicator: {
                      host: {
                        name: "Ece's computer",
                      },
                      url: {
                        full: 'www.bad.com',
                      },
                    },
                    feed: {
                      name: 'threatece-feed',
                    },
                  },
                ],
              },
            },
            fields: { _percolator_document_slot: [0, 2] },
          },
          {
            _source: {
              threat: {
                enrichments: [
                  {
                    matched: {
                      id: 'JsPsb989sS',
                      index: 'test-index',
                      atomic: 'www.bad.com',
                      field: 'url',
                      type: 'indicator_match_rule',
                    },
                    indicator: {
                      host: {
                        name: "Ece's computer",
                      },
                      url: {
                        full: 'www.bad.com',
                      },
                    },
                    feed: {
                      name: 'threatece-feed',
                    },
                  },
                ],
              },
            },
            fields: { _percolator_document_slot: [0] },
          },
        ],
      },
    } as unknown as estypes.SearchResponse<
      { threat: { enrichments: ThreatEnrichment[] } },
      unknown
    >;

    const enrichedEvents = enrichEvents({
      percolatorResponse,
      hits: [
        {
          _id: '1111',
          _index: 'event-index',
          _source: { host: { name: "Ece's computer" }, url: 'www.bad.com' },
        },
        {
          _id: '222',
          _index: 'event-index',
          _source: { host: { name: "not Ece's computer" }, url: 'www.good.com' },
        },
        {
          _id: '333',
          _index: 'event-index',
          _source: { host: { name: "Ece's computer" }, url: 'www.good.com' },
        },
      ],
    });

    expect(enrichedEvents[0]).toEqual({
      _id: '1111',
      _index: 'event-index',
      _source: {
        host: { name: "Ece's computer" },
        url: 'www.bad.com',
        threat: {
          enrichments: [
            {
              matched: {
                id: 'HdmY0yLld01',
                index: 'test-index',
                atomic: "Ece's computer",
                field: 'host.name',
                type: 'indicator_match_rule',
              },
              indicator: { host: { name: "Ece's computer" }, url: { full: 'www.bad.com' } },
              feed: { name: 'threatece-feed' },
            },
            {
              matched: {
                id: 'JsPsb989sS',
                index: 'test-index',
                atomic: 'www.bad.com',
                field: 'url',
                type: 'indicator_match_rule',
              },
              indicator: { host: { name: "Ece's computer" }, url: { full: 'www.bad.com' } },
              feed: { name: 'threatece-feed' },
            },
          ],
        },
      },
    });

    expect(enrichedEvents[1]).toEqual({
      _id: '333',
      _index: 'event-index',
      _source: {
        host: { name: "Ece's computer" },
        url: 'www.good.com',
        threat: {
          enrichments: [
            {
              matched: {
                id: 'HdmY0yLld01',
                index: 'test-index',
                atomic: "Ece's computer",
                field: 'host.name',
                type: 'indicator_match_rule',
              },
              indicator: { host: { name: "Ece's computer" }, url: { full: 'www.bad.com' } },
              feed: { name: 'threatece-feed' },
            },
          ],
        },
      },
    });
  });
});
