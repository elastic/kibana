/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventDetailsFormattedFields, eventHit } from '@kbn/securitysolution-t-grid';
import { EventHit } from '../search_strategy';
import { getDataFromFieldsHits } from './field_formatters';

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
          field: 'crazy.pants',
          values: [
            '{"matched.field":["matched_field"],"first_seen":["2021-02-22T17:29:25.195Z"],"provider":["yourself"],"type":["custom"],"matched.atomic":["matched_atomic"],"lazer":[{"great.field":["grrrrr"],"lazer":[{"lazer":[{"cool":true,"lazer":[{"lazer":[{"lazer":[{"lazer":[{"whoa":false}]}]}]}]}]},{"lazer":[{"cool":false}]}]},{"great.field":["grrrrr_2"]}]}',
          ],
          originalValue: [
            '{"matched.field":["matched_field"],"first_seen":["2021-02-22T17:29:25.195Z"],"provider":["yourself"],"type":["custom"],"matched.atomic":["matched_atomic"],"lazer":[{"great.field":["grrrrr"],"lazer":[{"lazer":[{"cool":true,"lazer":[{"lazer":[{"lazer":[{"lazer":[{"whoa":false}]}]}]}]}]},{"lazer":[{"cool":false}]}]},{"great.field":["grrrrr_2"]}]}',
          ],
          isObjectArray: true,
        },
      ];
      const result = getDataFromFieldsHits(whackFields);
      expect(result).toMatchObject(whackResultFields);
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
          isObjectArray: false,
          originalValue: ['>'],
          values: ['>'],
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
          isObjectArray: false,
          originalValue: ['m'],
          values: ['m'],
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
      expect(result).toMatchObject(ruleParametersResultFields);
    });

    it('get data from threat enrichments', () => {
      const data = {
        'kibana.alert.rule.parameters': [
          {
            severity_mapping: [],
            references: [],
            threat_language: 'kuery',
            description: 'The threat indicator rule description.',
            language: 'kuery',
            threat_mapping: [
              {
                entries: [
                  {
                    field: 'myhash.mysha256',
                    type: 'mapping',
                    value: 'threat.indicator.file.hash.sha256',
                  },
                ],
              },
            ],
            type: 'threat_match',
            threat_filters: [],
            exceptions_list: [],
            from: 'now-50000h',
            timeline_id: '495ad7a7-316e-4544-8a0f-9c098daee76e',
            severity: 'critical',
            max_signals: 100,
            risk_score: 20,
            risk_score_mapping: [],
            author: [],
            threat_indicator_path: 'threat.indicator',
            query: '*:*',
            index: ['suspicious-*'],
            version: 1,
            threat_query: '*:*',
            rule_id: 'rule_testing',
            required_fields: [],
            immutable: false,
            related_integrations: [],
            timeline_title: 'Generic Threat Match Timeline',
            threat_index: ['filebeat-*'],
            setup: '',
            false_positives: [],
            threat: [],
            to: 'now',
          },
        ],
        'signal.rule.version': ['1'],
        'kibana.alert.status': ['active'],
        'signal.ancestors.index': ['suspicious-source-event-001'],
        'signal.depth': [1],
        'signal.rule.immutable': ['false'],
        'kibana.alert.rule.rule_type_id': ['siem.indicatorRule'],
        'signal.rule.name': ['Threat Indicator Rule Test'],
        'signal.rule.rule_id': ['rule_testing'],
        'kibana.alert.rule.timeline_id': ['495ad7a7-316e-4544-8a0f-9c098daee76e'],
        'threat.enrichments': [
          {
            'matched.field': ['myhash.mysha256'],
            'matched.index': ['logs-ti_abusech.malware'],
            'matched.type': ['indicator_match_rule'],
            'feed.name': ['AbuseCH malware'],
            'matched.atomic': ['a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3'],
          },
        ],
      };

      const ruleParametersResultFields = [
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.severity_mapping',
          isObjectArray: false,
          originalValue: [],
          values: [],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.references',
          isObjectArray: false,
          originalValue: [],
          values: [],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.threat_language',
          isObjectArray: false,
          originalValue: ['kuery'],
          values: ['kuery'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.description',
          isObjectArray: false,
          originalValue: ['The threat indicator rule description.'],
          values: ['The threat indicator rule description.'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.language',
          isObjectArray: false,
          originalValue: ['kuery'],
          values: ['kuery'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.threat_mapping',
          isObjectArray: true,
          originalValue: [
            '{"entries":[{"field":"myhash.mysha256","type":"mapping","value":"threat.indicator.file.hash.sha256"}]}',
          ],
          values: [
            '{"entries":[{"field":"myhash.mysha256","type":"mapping","value":"threat.indicator.file.hash.sha256"}]}',
          ],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.type',
          isObjectArray: false,
          originalValue: ['threat_match'],
          values: ['threat_match'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.threat_filters',
          isObjectArray: false,
          originalValue: [],
          values: [],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.exceptions_list',
          isObjectArray: false,
          originalValue: [],
          values: [],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.from',
          isObjectArray: false,
          originalValue: ['now-50000h'],
          values: ['now-50000h'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.timeline_id',
          isObjectArray: false,
          originalValue: ['495ad7a7-316e-4544-8a0f-9c098daee76e'],
          values: ['495ad7a7-316e-4544-8a0f-9c098daee76e'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.severity',
          isObjectArray: false,
          originalValue: ['critical'],
          values: ['critical'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.max_signals',
          isObjectArray: false,
          originalValue: ['100'],
          values: ['100'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.risk_score',
          isObjectArray: false,
          originalValue: ['20'],
          values: ['20'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.risk_score_mapping',
          isObjectArray: false,
          originalValue: [],
          values: [],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.author',
          isObjectArray: false,
          originalValue: [],
          values: [],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.threat_indicator_path',
          isObjectArray: false,
          originalValue: ['threat.indicator'],
          values: ['threat.indicator'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.query',
          isObjectArray: false,
          originalValue: ['*:*'],
          values: ['*:*'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.index',
          isObjectArray: false,
          originalValue: ['suspicious-*'],
          values: ['suspicious-*'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.version',
          isObjectArray: false,
          originalValue: ['1'],
          values: ['1'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.threat_query',
          isObjectArray: false,
          originalValue: ['*:*'],
          values: ['*:*'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.rule_id',
          isObjectArray: false,
          originalValue: ['rule_testing'],
          values: ['rule_testing'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.required_fields',
          isObjectArray: false,
          originalValue: [],
          values: [],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.immutable',
          isObjectArray: false,
          originalValue: ['false'],
          values: ['false'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.related_integrations',
          isObjectArray: false,
          originalValue: [],
          values: [],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.timeline_title',
          isObjectArray: false,
          originalValue: ['Generic Threat Match Timeline'],
          values: ['Generic Threat Match Timeline'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.threat_index',
          isObjectArray: false,
          originalValue: ['filebeat-*'],
          values: ['filebeat-*'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.setup',
          isObjectArray: false,
          originalValue: [''],
          values: [''],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.false_positives',
          isObjectArray: false,
          originalValue: [],
          values: [],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.threat',
          isObjectArray: false,
          originalValue: [],
          values: [],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.parameters.to',
          isObjectArray: false,
          originalValue: ['now'],
          values: ['now'],
        },
        {
          category: 'signal',
          field: 'signal.rule.version',
          isObjectArray: false,
          originalValue: ['1'],
          values: ['1'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.status',
          isObjectArray: false,
          originalValue: ['active'],
          values: ['active'],
        },
        {
          category: 'signal',
          field: 'signal.ancestors.index',
          isObjectArray: false,
          originalValue: ['suspicious-source-event-001'],
          values: ['suspicious-source-event-001'],
        },
        {
          category: 'signal',
          field: 'signal.depth',
          isObjectArray: false,
          originalValue: ['1'],
          values: ['1'],
        },
        {
          category: 'signal',
          field: 'signal.rule.immutable',
          isObjectArray: false,
          originalValue: ['false'],
          values: ['false'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.rule_type_id',
          isObjectArray: false,
          originalValue: ['siem.indicatorRule'],
          values: ['siem.indicatorRule'],
        },
        {
          category: 'signal',
          field: 'signal.rule.name',
          isObjectArray: false,
          originalValue: ['Threat Indicator Rule Test'],
          values: ['Threat Indicator Rule Test'],
        },
        {
          category: 'signal',
          field: 'signal.rule.rule_id',
          isObjectArray: false,
          originalValue: ['rule_testing'],
          values: ['rule_testing'],
        },
        {
          category: 'kibana',
          field: 'kibana.alert.rule.timeline_id',
          isObjectArray: false,
          originalValue: ['495ad7a7-316e-4544-8a0f-9c098daee76e'],
          values: ['495ad7a7-316e-4544-8a0f-9c098daee76e'],
        },
        {
          category: 'threat',
          field: 'threat.enrichments',
          isObjectArray: true,
          originalValue: [
            '{"matched.field":["myhash.mysha256"],"matched.index":["logs-ti_abusech.malware"],"matched.type":["indicator_match_rule"],"feed.name":["AbuseCH malware"],"matched.atomic":["a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3"]}',
          ],
          values: [
            '{"matched.field":["myhash.mysha256"],"matched.index":["logs-ti_abusech.malware"],"matched.type":["indicator_match_rule"],"feed.name":["AbuseCH malware"],"matched.atomic":["a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3"]}',
          ],
        },
        {
          category: 'threat',
          field: 'threat.enrichments.matched.field',
          isObjectArray: false,
          originalValue: ['myhash.mysha256'],
          values: ['myhash.mysha256'],
        },
        {
          category: 'threat',
          field: 'threat.enrichments.matched.index',
          isObjectArray: false,
          originalValue: ['logs-ti_abusech.malware'],
          values: ['logs-ti_abusech.malware'],
        },
        {
          category: 'threat',
          field: 'threat.enrichments.matched.type',
          isObjectArray: false,
          originalValue: ['indicator_match_rule'],
          values: ['indicator_match_rule'],
        },
        {
          category: 'threat',
          field: 'threat.enrichments.feed.name',
          isObjectArray: false,
          originalValue: ['AbuseCH malware'],
          values: ['AbuseCH malware'],
        },
        {
          category: 'threat',
          field: 'threat.enrichments.matched.atomic',
          isObjectArray: false,
          originalValue: ['a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3'],
          values: ['a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3'],
        },
      ];
      const result = getDataFromFieldsHits(data);
      expect(result).toMatchObject(ruleParametersResultFields);
    });
  });
});
