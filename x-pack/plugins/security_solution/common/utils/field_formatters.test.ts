/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventHit, EventSource } from '../search_strategy';
import { getDataFromFieldsHits, getDataFromSourceHits, getDataSafety } from './field_formatters';
import { eventDetailsFormattedFields, eventHit } from '@kbn/securitysolution-t-grid';

describe('Events Details Helpers', () => {
  const fields: EventHit['fields'] = eventHit.fields;
  const resultFields = eventDetailsFormattedFields;
  describe('#getDataFromFieldsHits', () => {
    it('happy path', () => {
      const result = getDataFromFieldsHits(fields);
      expect(result).toEqual(resultFields);
    });
    it('lets get weird', () => {
      const whackFields = {
        'crazy.pants': [
          {
            'matched.field': ['matched_field'],
            first_seen: ['2021-02-22T17:29:25.195Z'],
            provider: ['yourself'],
            type: ['custom'],
            'matched.atomic': ['matched_atomic'],
            lazer: [
              {
                'great.field': ['grrrrr'],
                lazer: [
                  {
                    lazer: [
                      {
                        cool: true,
                        lazer: [
                          {
                            lazer: [
                              {
                                lazer: [
                                  {
                                    lazer: [
                                      {
                                        whoa: false,
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    lazer: [
                      {
                        cool: false,
                      },
                    ],
                  },
                ],
              },
              {
                'great.field': ['grrrrr_2'],
              },
            ],
          },
        ],
      };
      const whackResultFields = [
        {
          category: 'crazy',
          field: 'crazy.pants.matched.field',
          values: ['matched_field'],
          originalValue: ['matched_field'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.first_seen',
          values: ['2021-02-22T17:29:25.195Z'],
          originalValue: ['2021-02-22T17:29:25.195Z'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.provider',
          values: ['yourself'],
          originalValue: ['yourself'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.type',
          values: ['custom'],
          originalValue: ['custom'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.matched.atomic',
          values: ['matched_atomic'],
          originalValue: ['matched_atomic'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.lazer.great.field',
          values: ['grrrrr', 'grrrrr_2'],
          originalValue: ['grrrrr', 'grrrrr_2'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.lazer.lazer.lazer.cool',
          values: ['true', 'false'],
          originalValue: ['true', 'false'],
          isObjectArray: false,
        },
        {
          category: 'crazy',
          field: 'crazy.pants.lazer.lazer.lazer.lazer.lazer.lazer.lazer.whoa',
          values: ['false'],
          originalValue: ['false'],
          isObjectArray: false,
        },
      ];
      const result = getDataFromFieldsHits(whackFields);
      expect(result).toEqual(whackResultFields);
    });
  });
  it('#getDataFromSourceHits', () => {
    const _source: EventSource = {
      '@timestamp': '2021-02-24T00:41:06.527Z',
      'kibana.alert.workflow_status': 'open',
      'signal.rule.name': 'Rawr',
      'threat.indicator': [
        {
          provider: 'yourself',
          type: 'custom',
          first_seen: ['2021-02-22T17:29:25.195Z'],
          matched: { atomic: 'atom', field: 'field', type: 'type' },
        },
        {
          provider: 'other_you',
          type: 'custom',
          first_seen: '2021-02-22T17:29:25.195Z',
          matched: { atomic: 'atom', field: 'field', type: 'type' },
        },
      ],
    };
    expect(getDataFromSourceHits(_source)).toEqual([
      {
        category: 'base',
        field: '@timestamp',
        values: ['2021-02-24T00:41:06.527Z'],
        originalValue: ['2021-02-24T00:41:06.527Z'],
        isObjectArray: false,
      },
      {
        category: 'kibana',
        field: 'kibana.alert.workflow_status',
        values: ['open'],
        originalValue: ['open'],
        isObjectArray: false,
      },
      {
        category: 'signal',
        field: 'signal.rule.name',
        values: ['Rawr'],
        originalValue: ['Rawr'],
        isObjectArray: false,
      },
      {
        category: 'threat',
        field: 'threat.indicator',
        values: [
          '{"provider":"yourself","type":"custom","first_seen":["2021-02-22T17:29:25.195Z"],"matched":{"atomic":"atom","field":"field","type":"type"}}',
          '{"provider":"other_you","type":"custom","first_seen":"2021-02-22T17:29:25.195Z","matched":{"atomic":"atom","field":"field","type":"type"}}',
        ],
        originalValue: [
          '{"provider":"yourself","type":"custom","first_seen":["2021-02-22T17:29:25.195Z"],"matched":{"atomic":"atom","field":"field","type":"type"}}',
          '{"provider":"other_you","type":"custom","first_seen":"2021-02-22T17:29:25.195Z","matched":{"atomic":"atom","field":"field","type":"type"}}',
        ],
        isObjectArray: true,
      },
    ]);
  });
  it('#getDataSafety', async () => {
    const result = await getDataSafety(getDataFromFieldsHits, fields);
    expect(result).toEqual(resultFields);
  });
});
