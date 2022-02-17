/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventDetailsFormattedFields, eventHit } from '@kbn/securitysolution-t-grid';
import { EventHit, EventSource } from '../search_strategy';
import { getDataFromFieldsHits, getDataFromSourceHits, getDataSafety } from './field_formatters';

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
    it('flattens alert parameters', () => {
      const ruleParameterFields = {
        'kibana.alert.rule.parameters': [
          {
            nodeType: 'host',
            criteria: [
              {
                metric: 'cpu',
                comparator: '>',
                threshold: [3],
                timeSize: 1,
                timeUnit: 'm',
                customMetric: {
                  type: 'custom',
                  id: 'alert-custom-metric',
                  field: '',
                  aggregation: 'avg',
                },
              },
            ],
            sourceId: 'default',
          },
        ],
      };
      const ruleParametersResultFields = [
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.nodeType',
          values: ['host'],
          originalValue: ['host'],
          isObjectArray: false,
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.criteria.metric',
          isObjectArray: false,
          originalValue: ['cpu'],
          values: ['cpu'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.criteria.comparator',
          values: ['>'],
          originalValue: ['>'],
          isObjectArray: false,
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.criteria.threshold',
          isObjectArray: false,
          originalValue: ['3'],
          values: ['3'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.criteria.timeSize',
          isObjectArray: false,
          originalValue: ['1'],
          values: ['1'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.criteria.timeUnit',
          values: ['m'],
          originalValue: ['m'],
          isObjectArray: false,
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.criteria.customMetric.type',
          isObjectArray: false,
          originalValue: ['custom'],
          values: ['custom'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.criteria.customMetric.id',
          isObjectArray: false,
          originalValue: ['alert-custom-metric'],
          values: ['alert-custom-metric'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.criteria.customMetric.field',
          isObjectArray: false,
          originalValue: [''],
          values: [''],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.criteria.customMetric.aggregation',
          isObjectArray: false,
          originalValue: ['avg'],
          values: ['avg'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.sourceId',
          isObjectArray: false,
          originalValue: ['default'],
          values: ['default'],
        },
      ];

      const result = getDataFromFieldsHits(ruleParameterFields);
      expect(result).toEqual(ruleParametersResultFields);
    });
  });

  it('#getDataFromSourceHits', () => {
    const _source: EventSource = {
      '@timestamp': '2021-02-24T00:41:06.527Z',
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.rule.name': 'Rawr',
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
        category: 'kibana',
        field: 'kibana.alert.rule.name',
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
