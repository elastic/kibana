/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from 'src/plugins/data/public';

import {
  CtiEnrichment,
  CtiEventEnrichmentRequestOptions,
  CtiEventEnrichmentStrategyResponse,
  CtiQueries,
} from '.';

export const buildEventEnrichmentRequestOptionsMock = (
  overrides: Partial<CtiEventEnrichmentRequestOptions> = {}
): CtiEventEnrichmentRequestOptions => ({
  defaultIndex: ['filebeat-*'],
  eventFields: {
    'file.hash.md5': '1eee2bf3f56d8abed72da2bc523e7431',
    'source.ip': '127.0.0.1',
    'url.full': 'elastic.co',
  },
  factoryQueryType: CtiQueries.eventEnrichment,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  timerange: { interval: '', from: '2020-09-13T09:00:43.249Z', to: '2020-09-14T09:00:43.249Z' },
  ...overrides,
});

export const buildEventEnrichmentRawResponseMock = (): IEsSearchResponse => ({
  rawResponse: {
    took: 17,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: 6.0637846,
      hits: [
        {
          _index: 'filebeat-8.0.0-2021.05.28-000001',
          _id: '31408415b6d5601a92d29b86c2519658f210c194057588ae396d55cc20b3f03d',
          _score: 6.0637846,
          fields: {
            'event.category': ['threat'],
            'threat.indicator.file.type': ['html'],
            'related.hash': [
              '5529de7b60601aeb36f57824ed0e1ae8',
              '15b012e6f626d0f88c2926d2bf4ca394d7b8ee07cc06d2ec05ea76bed3e8a05e',
              '768:NXSFGJ/ooP6FawrB7Bo1MWnF/jRmhJImp:1SFXIqBo1Mwj2p',
            ],
            'threat.indicator.first_seen': ['2021-05-28T18:33:29.000Z'],
            'threat.indicator.file.hash.tlsh': [
              'FFB20B82F6617061C32784E2712F7A46B179B04FD1EA54A0F28CD8E9CFE4CAA1617F1C',
            ],
            'service.type': ['threatintel'],
            'threat.indicator.file.hash.ssdeep': [
              '768:NXSFGJ/ooP6FawrB7Bo1MWnF/jRmhJImp:1SFXIqBo1Mwj2p',
            ],
            'agent.type': ['filebeat'],
            'event.module': ['threatintel'],
            'threat.indicator.type': ['file'],
            'agent.name': ['rylastic.local'],
            'threat.indicator.file.hash.sha256': [
              '15b012e6f626d0f88c2926d2bf4ca394d7b8ee07cc06d2ec05ea76bed3e8a05e',
            ],
            'event.kind': ['enrichment'],
            'threat.indicator.file.hash.md5': ['5529de7b60601aeb36f57824ed0e1ae8'],
            'fileset.name': ['abusemalware'],
            'input.type': ['httpjson'],
            'agent.hostname': ['rylastic.local'],
            tags: ['threatintel-abusemalware', 'forwarded'],
            'event.ingested': ['2021-05-28T18:33:55.086Z'],
            '@timestamp': ['2021-05-28T18:33:52.993Z'],
            'agent.id': ['ff93aee5-86a1-4a61-b0e6-0cdc313d01b5'],
            'ecs.version': ['1.6.0'],
            'event.reference': [
              'https://urlhaus-api.abuse.ch/v1/download/15b012e6f626d0f88c2926d2bf4ca394d7b8ee07cc06d2ec05ea76bed3e8a05e/',
            ],
            'event.type': ['indicator'],
            'event.created': ['2021-05-28T18:33:52.993Z'],
            'agent.ephemeral_id': ['d6b14f65-5bf3-430d-8315-7b5613685979'],
            'threat.indicator.file.size': [24738],
            'agent.version': ['8.0.0'],
            'event.dataset': ['ti_abusech.malware'],
          },
          matched_queries: ['file.hash.md5'],
        },
      ],
    },
  },
});

export const buildEventEnrichmentMock = (
  overrides: Partial<CtiEnrichment> = {}
): CtiEnrichment => ({
  '@timestamp': ['2021-05-28T18:33:52.993Z'],
  'agent.ephemeral_id': ['d6b14f65-5bf3-430d-8315-7b5613685979'],
  'agent.hostname': ['rylastic.local'],
  'agent.id': ['ff93aee5-86a1-4a61-b0e6-0cdc313d01b5'],
  'agent.name': ['rylastic.local'],
  'agent.type': ['filebeat'],
  'agent.version': ['8.0.0'],
  'ecs.version': ['1.6.0'],
  'event.category': ['threat'],
  'event.created': ['2021-05-28T18:33:52.993Z'],
  'event.dataset': ['ti_abusech.malware'],
  'event.ingested': ['2021-05-28T18:33:55.086Z'],
  'event.kind': ['enrichment'],
  'event.module': ['threatintel'],
  'event.reference': [
    'https://urlhaus-api.abuse.ch/v1/download/15b012e6f626d0f88c2926d2bf4ca394d7b8ee07cc06d2ec05ea76bed3e8a05e/',
  ],
  'event.type': ['indicator'],
  'fileset.name': ['abusemalware'],
  'input.type': ['httpjson'],
  'matched.atomic': ['5529de7b60601aeb36f57824ed0e1ae8'],
  'matched.field': ['file.hash.md5'],
  'matched.id': ['31408415b6d5601a92d29b86c2519658f210c194057588ae396d55cc20b3f03d'],
  'matched.index': ['filebeat-8.0.0-2021.05.28-000001'],
  'matched.type': ['investigation_time'],
  'related.hash': [
    '5529de7b60601aeb36f57824ed0e1ae8',
    '15b012e6f626d0f88c2926d2bf4ca394d7b8ee07cc06d2ec05ea76bed3e8a05e',
    '768:NXSFGJ/ooP6FawrB7Bo1MWnF/jRmhJImp:1SFXIqBo1Mwj2p',
  ],
  'service.type': ['threatintel'],
  tags: ['threatintel-abusemalware', 'forwarded'],
  'threat.indicator.file.hash.md5': ['5529de7b60601aeb36f57824ed0e1ae8'],
  'threat.indicator.file.hash.sha256': [
    '15b012e6f626d0f88c2926d2bf4ca394d7b8ee07cc06d2ec05ea76bed3e8a05e',
  ],
  'threat.indicator.file.hash.ssdeep': ['768:NXSFGJ/ooP6FawrB7Bo1MWnF/jRmhJImp:1SFXIqBo1Mwj2p'],
  'threat.indicator.file.hash.tlsh': [
    'FFB20B82F6617061C32784E2712F7A46B179B04FD1EA54A0F28CD8E9CFE4CAA1617F1C',
  ],
  'threat.indicator.file.size': [24738],
  'threat.indicator.file.type': ['html'],
  'threat.indicator.first_seen': ['2021-05-28T18:33:29.000Z'],
  'threat.indicator.type': ['file'],
  ...overrides,
});

export const buildEventEnrichmentResponseMock = (
  overrides: Partial<CtiEventEnrichmentStrategyResponse> = {}
): CtiEventEnrichmentStrategyResponse => ({
  ...buildEventEnrichmentRawResponseMock(),
  enrichments: [buildEventEnrichmentMock()],
  inspect: { dsl: ['{"mocked": "json"}'] },
  totalCount: 0,
  ...overrides,
});
