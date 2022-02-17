/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENRICHMENT_TYPES } from '../../../../../common/cti/constants';
import { buildEventEnrichmentMock } from '../../../../../common/search_strategy/security_solution/cti/index.mock';
import {
  filterDuplicateEnrichments,
  getEnrichmentFields,
  parseExistingEnrichments,
  getEnrichmentIdentifiers,
} from './helpers';

describe('parseExistingEnrichments', () => {
  it('returns an empty array if data is empty', () => {
    expect(parseExistingEnrichments([])).toEqual([]);
  });

  it('returns an empty array if data contains no enrichment field', () => {
    const data = [
      {
        category: 'host',
        field: 'host.os.name.text',
        isObjectArray: false,
        originalValue: ['Mac OS X'],
        values: ['Mac OS X'],
      },
    ];
    expect(parseExistingEnrichments(data)).toEqual([]);
  });

  it('returns an empty array if enrichment field contains invalid JSON', () => {
    const data = [
      {
        category: 'threat',
        field: 'threat.enrichments',
        isObjectArray: true,
        originalValue: ['whoops'],
        values: ['whoops'],
      },
    ];
    expect(parseExistingEnrichments(data)).toEqual([]);
  });

  it('returns an array if enrichment field contains valid JSON', () => {
    const data = [
      {
        category: 'threat',
        field: 'threat.enrichments',
        isObjectArray: true,
        originalValue: [
          `{"indicator":{"first_seen":"2021-03-21T19:40:19.000Z","provider":"provider","reference":"http://reference.url","ip":"192.168.1.19","type":"ip"},"matched":{"atomic":"192.168.1.19","field":"host.ip","id":"0SIZMnoB_Blp1Ib9ZYHU","index":"filebeat-8.0.0-2021.05.28-000001","type":"indicator_match_rule"}}`,
        ],
        values: [
          `{"indicator":{"first_seen":"2021-03-21T19:40:19.000Z","provider":"provider","reference":"http://reference.url","ip":"192.168.1.19","type":"ip"},"matched":{"atomic":"192.168.1.19","field":"host.ip","id":"0SIZMnoB_Blp1Ib9ZYHU","index":"filebeat-8.0.0-2021.05.28-000001","type":"indicator_match_rule"}}`,
        ],
      },
    ];

    expect(parseExistingEnrichments(data)).toEqual([
      [
        {
          category: 'indicator',
          field: 'indicator.first_seen',
          isObjectArray: false,
          originalValue: ['2021-03-21T19:40:19.000Z'],
          values: ['2021-03-21T19:40:19.000Z'],
        },
        {
          category: 'indicator',
          field: 'indicator.provider',
          isObjectArray: false,
          originalValue: ['provider'],
          values: ['provider'],
        },
        {
          category: 'indicator',
          field: 'indicator.reference',
          isObjectArray: false,
          originalValue: ['http://reference.url'],
          values: ['http://reference.url'],
        },
        {
          category: 'indicator',
          field: 'indicator.ip',
          isObjectArray: false,
          originalValue: ['192.168.1.19'],
          values: ['192.168.1.19'],
        },
        {
          category: 'indicator',
          field: 'indicator.type',
          isObjectArray: false,
          originalValue: ['ip'],
          values: ['ip'],
        },
        {
          category: 'matched',
          field: 'matched.atomic',
          isObjectArray: false,
          originalValue: ['192.168.1.19'],
          values: ['192.168.1.19'],
        },
        {
          category: 'matched',
          field: 'matched.field',
          isObjectArray: false,
          originalValue: ['host.ip'],
          values: ['host.ip'],
        },
        {
          category: 'matched',
          field: 'matched.id',
          isObjectArray: false,
          originalValue: ['0SIZMnoB_Blp1Ib9ZYHU'],
          values: ['0SIZMnoB_Blp1Ib9ZYHU'],
        },
        {
          category: 'matched',
          field: 'matched.index',
          isObjectArray: false,
          originalValue: ['filebeat-8.0.0-2021.05.28-000001'],
          values: ['filebeat-8.0.0-2021.05.28-000001'],
        },
        {
          category: 'matched',
          field: 'matched.type',
          isObjectArray: false,
          originalValue: [ENRICHMENT_TYPES.IndicatorMatchRule],
          values: [ENRICHMENT_TYPES.IndicatorMatchRule],
        },
      ],
    ]);
  });

  it('returns multiple arrays for multiple enrichments', () => {
    const data = [
      {
        category: 'threat',
        field: 'threat.enrichments',
        isObjectArray: true,
        originalValue: [
          `{"indicator":{"first_seen":"2021-03-21T19:40:19.000Z","provider":"provider","reference":"http://reference.url","ip":"192.168.1.19","type":"ip"},"matched":{"atomic":"192.168.1.19","field":"host.ip","id":"0SIZMnoB_Blp1Ib9ZYHU","index":"filebeat-8.0.0-2021.05.28-000001","type":"indicator_match_rule"}}`,
          `{"indicator":{"first_seen":"2021-03-21T19:40:19.000Z","provider":"other","reference":"http://reference.url","ip":"192.168.1.19","type":"ip"},"matched":{"atomic":"192.168.1.19","field":"host.ip","id":"iiL9NHoB_Blp1Ib9yoJo","index":"filebeat-8.0.0-2021.05.28-000001","type":"indicator_match_rule"}}`,
        ],
        values: [
          `{"indicator":{"first_seen":"2021-03-21T19:40:19.000Z","provider":"provider","reference":"http://reference.url","ip":"192.168.1.19","type":"ip"},"matched":{"atomic":"192.168.1.19","field":"host.ip","id":"0SIZMnoB_Blp1Ib9ZYHU","index":"filebeat-8.0.0-2021.05.28-000001","type":"indicator_match_rule"}}`,
          `{"indicator":{"first_seen":"2021-03-21T19:40:19.000Z","provider":"other","reference":"http://reference.url","ip":"192.168.1.19","type":"ip"},"matched":{"atomic":"192.168.1.19","field":"host.ip","id":"iiL9NHoB_Blp1Ib9yoJo","index":"filebeat-8.0.0-2021.05.28-000001","type":"indicator_match_rule"}}`,
        ],
      },
    ];

    expect(parseExistingEnrichments(data)).toEqual([
      expect.arrayContaining([
        {
          category: 'indicator',
          field: 'indicator.first_seen',
          isObjectArray: false,
          originalValue: ['2021-03-21T19:40:19.000Z'],
          values: ['2021-03-21T19:40:19.000Z'],
        },
        {
          category: 'indicator',
          field: 'indicator.provider',
          isObjectArray: false,
          originalValue: ['provider'],
          values: ['provider'],
        },
        {
          category: 'indicator',
          field: 'indicator.reference',
          isObjectArray: false,
          originalValue: ['http://reference.url'],
          values: ['http://reference.url'],
        },
        {
          category: 'indicator',
          field: 'indicator.ip',
          isObjectArray: false,
          originalValue: ['192.168.1.19'],
          values: ['192.168.1.19'],
        },
        {
          category: 'indicator',
          field: 'indicator.type',
          isObjectArray: false,
          originalValue: ['ip'],
          values: ['ip'],
        },
        {
          category: 'matched',
          field: 'matched.atomic',
          isObjectArray: false,
          originalValue: ['192.168.1.19'],
          values: ['192.168.1.19'],
        },
        {
          category: 'matched',
          field: 'matched.field',
          isObjectArray: false,
          originalValue: ['host.ip'],
          values: ['host.ip'],
        },
        {
          category: 'matched',
          field: 'matched.id',
          isObjectArray: false,
          originalValue: ['0SIZMnoB_Blp1Ib9ZYHU'],
          values: ['0SIZMnoB_Blp1Ib9ZYHU'],
        },
        {
          category: 'matched',
          field: 'matched.index',
          isObjectArray: false,
          originalValue: ['filebeat-8.0.0-2021.05.28-000001'],
          values: ['filebeat-8.0.0-2021.05.28-000001'],
        },
        {
          category: 'matched',
          field: 'matched.type',
          isObjectArray: false,
          originalValue: [ENRICHMENT_TYPES.IndicatorMatchRule],
          values: [ENRICHMENT_TYPES.IndicatorMatchRule],
        },
      ]),
      expect.arrayContaining([
        {
          category: 'indicator',
          field: 'indicator.first_seen',
          isObjectArray: false,
          originalValue: ['2021-03-21T19:40:19.000Z'],
          values: ['2021-03-21T19:40:19.000Z'],
        },
        {
          category: 'indicator',
          field: 'indicator.provider',
          isObjectArray: false,
          originalValue: ['other'],
          values: ['other'],
        },
        {
          category: 'indicator',
          field: 'indicator.reference',
          isObjectArray: false,
          originalValue: ['http://reference.url'],
          values: ['http://reference.url'],
        },
        {
          category: 'indicator',
          field: 'indicator.ip',
          isObjectArray: false,
          originalValue: ['192.168.1.19'],
          values: ['192.168.1.19'],
        },
        {
          category: 'indicator',
          field: 'indicator.type',
          isObjectArray: false,
          originalValue: ['ip'],
          values: ['ip'],
        },
        {
          category: 'matched',
          field: 'matched.atomic',
          isObjectArray: false,
          originalValue: ['192.168.1.19'],
          values: ['192.168.1.19'],
        },
        {
          category: 'matched',
          field: 'matched.field',
          isObjectArray: false,
          originalValue: ['host.ip'],
          values: ['host.ip'],
        },
        {
          category: 'matched',
          field: 'matched.id',
          isObjectArray: false,
          originalValue: ['iiL9NHoB_Blp1Ib9yoJo'],
          values: ['iiL9NHoB_Blp1Ib9yoJo'],
        },
        {
          category: 'matched',
          field: 'matched.index',
          isObjectArray: false,
          originalValue: ['filebeat-8.0.0-2021.05.28-000001'],
          values: ['filebeat-8.0.0-2021.05.28-000001'],
        },
        {
          category: 'matched',
          field: 'matched.type',
          isObjectArray: false,
          originalValue: [ENRICHMENT_TYPES.IndicatorMatchRule],
          values: [ENRICHMENT_TYPES.IndicatorMatchRule],
        },
      ]),
    ]);
  });
});

describe('filterDuplicateEnrichments', () => {
  it('returns an empty array if given one', () => {
    expect(filterDuplicateEnrichments([])).toEqual([]);
  });

  it('returns the existing enrichment if given both that and an investigation-time enrichment for the same indicator and field', () => {
    const existingEnrichment = buildEventEnrichmentMock({
      'matched.type': [ENRICHMENT_TYPES.IndicatorMatchRule],
    });
    const investigationEnrichment = buildEventEnrichmentMock({
      'matched.type': [ENRICHMENT_TYPES.InvestigationTime],
    });
    expect(filterDuplicateEnrichments([existingEnrichment, investigationEnrichment])).toEqual([
      existingEnrichment,
    ]);
  });

  it('includes two enrichments from the same indicator if it matched different fields', () => {
    const enrichments = [
      buildEventEnrichmentMock(),
      buildEventEnrichmentMock({
        'matched.field': ['other.field'],
      }),
    ];
    expect(filterDuplicateEnrichments(enrichments)).toEqual(enrichments);
  });
});

describe('getEnrichmentFields', () => {
  it('returns an empty object if items is empty', () => {
    expect(getEnrichmentFields([])).toEqual({});
  });

  it('returns an object of event fields and values', () => {
    const data = [
      {
        category: 'source',
        field: 'source.ip',
        isObjectArray: false,
        originalValue: ['192.168.1.1'],
        values: ['192.168.1.1'],
      },
      {
        category: 'event',
        field: 'event.reference',
        isObjectArray: false,
        originalValue: ['https://urlhaus.abuse.ch/url/1055419/'],
        values: ['https://urlhaus.abuse.ch/url/1055419/'],
      },
    ];
    expect(getEnrichmentFields(data)).toEqual({
      'source.ip': '192.168.1.1',
    });
  });
});

describe('getEnrichmentIdentifiers', () => {
  it(`return feed name as feedName if it's present in enrichment`, () => {
    expect(
      getEnrichmentIdentifiers({
        'matched.id': [1],
        'matched.field': ['matched field'],
        'matched.atomic': ['matched atomic'],
        'matched.type': ['matched type'],
        'feed.name': ['feed name'],
      })
    ).toEqual({
      id: 1,
      field: 'matched field',
      value: 'matched atomic',
      type: 'matched type',
      feedName: 'feed name',
    });
  });
});
