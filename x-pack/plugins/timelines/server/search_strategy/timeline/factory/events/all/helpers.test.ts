/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_RULE_NAMESPACE,
  ALERT_WORKFLOW_STATUS,
  EVENT_KIND,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import {
  ALERT_ANCESTORS,
  ALERT_ORIGINAL_TIME,
  flattenWithPrefix,
} from '@kbn/securitysolution-rules';
import { eventHit } from '@kbn/securitysolution-t-grid';

import { EventHit } from '../../../../../../common/search_strategy';
import { TIMELINE_EVENTS_FIELDS } from './constants';
import { buildObjectForFieldPath, formatTimelineData } from './helpers';

describe('#formatTimelineData', () => {
  it('happy path', async () => {
    const res = await formatTimelineData(
      [
        TIMESTAMP,
        'host.name',
        'destination.ip',
        'source.ip',
        'source.geo.location',
        'threat.enrichments.matched.field',
      ],
      TIMELINE_EVENTS_FIELDS,
      eventHit
    );
    expect(res).toEqual({
      cursor: {
        tiebreaker: 'beats-ci-immutable-ubuntu-1804-1605624279743236239',
        value: '1605624488922',
      },
      node: {
        _id: 'tkCt1nUBaEgqnrVSZ8R_',
        _index: 'auditbeat-7.8.0-2020.11.05-000003',
        data: [
          {
            field: TIMESTAMP,
            value: ['2020-11-17T14:48:08.922Z'],
          },
          {
            field: 'host.name',
            value: ['beats-ci-immutable-ubuntu-1804-1605624279743236239'],
          },
          {
            field: 'threat.enrichments.matched.field',
            value: ['matched_field', 'other_matched_field', 'matched_field_2'],
          },
          {
            field: 'source.geo.location',
            value: [`{"lon":118.7778,"lat":32.0617}`],
          },
        ],
        ecs: {
          [TIMESTAMP]: ['2020-11-17T14:48:08.922Z'],
          _id: 'tkCt1nUBaEgqnrVSZ8R_',
          _index: 'auditbeat-7.8.0-2020.11.05-000003',
          agent: {
            type: ['auditbeat'],
          },
          event: {
            action: ['process_started'],
            category: ['process'],
            dataset: ['process'],
            kind: ['event'],
            module: ['system'],
            type: ['start'],
          },
          host: {
            id: ['e59991e835905c65ed3e455b33e13bd6'],
            ip: ['10.224.1.237', 'fe80::4001:aff:fee0:1ed', '172.17.0.1'],
            name: ['beats-ci-immutable-ubuntu-1804-1605624279743236239'],
            os: {
              family: ['debian'],
            },
          },
          message: ['Process go (PID: 4313) by user jenkins STARTED'],
          process: {
            args: ['go', 'vet', './...'],
            entity_id: ['Z59cIkAAIw8ZoK0H'],
            executable: [
              '/var/lib/jenkins/workspace/Beats_beats_PR-22624/.gvm/versions/go1.14.7.linux.amd64/bin/go',
            ],
            hash: {
              sha1: ['1eac22336a41e0660fb302add9d97daa2bcc7040'],
            },
            name: ['go'],
            pid: ['4313'],
            ppid: ['3977'],
            working_directory: [
              '/var/lib/jenkins/workspace/Beats_beats_PR-22624/src/github.com/elastic/beats/libbeat',
            ],
          },
          timestamp: '2020-11-17T14:48:08.922Z',
          user: {
            name: ['jenkins'],
          },
          threat: {
            enrichments: [
              {
                indicator: {
                  provider: ['yourself'],
                  reference: [],
                },
                matched: {
                  atomic: ['matched_atomic'],
                  field: ['matched_field', 'other_matched_field'],
                  type: [],
                },
              },
              {
                indicator: {
                  provider: ['other_you'],
                  reference: [],
                },
                matched: {
                  atomic: ['matched_atomic_2'],
                  field: ['matched_field_2'],
                  type: [],
                },
              },
            ],
          },
        },
      },
    });
  });

  it('rule signal results', async () => {
    const response: EventHit = {
      _index: '.siem-signals-patrykkopycinski-default-000007',
      _id: 'a77040f198355793c35bf22b900902371309be615381f0a2ec92c208b6132562',
      _score: 0,
      _source: {
        threshold_result: {
          count: 10000,
          value: '2a990c11-f61b-4c8e-b210-da2574e9f9db',
        },
        depth: 1,
        rule: flattenWithPrefix(ALERT_RULE_NAMESPACE, {
          note: null,
          throttle: null,
          references: [],
          severity_mapping: [],
          description: 'asdasd',
          created_at: '2021-01-09T11:25:45.046Z',
          language: 'kuery',
          threshold: {
            field: '',
            value: 200,
          },
          building_block_type: null,
          output_index: '.siem-signals-patrykkopycinski-default',
          type: 'threshold',
          rule_name_override: null,
          enabled: true,
          exceptions_list: [],
          updated_at: '2021-01-09T13:36:39.204Z',
          timestamp_override: null,
          from: 'now-360s',
          uuid: '696c24e0-526d-11eb-836c-e1620268b945',
          timeline_id: null,
          max_signals: 100,
          severity: 'low',
          risk_score: 21,
          risk_score_mapping: [],
          author: [],
          query: '_id :*',
          index: [
            'apm-*-transaction*',
            'traces-apm*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
          ],
          filters: [
            {
              $state: {
                store: 'appState',
              },
              meta: {
                negate: false,
                alias: null,
                disabled: false,
                type: 'exists',
                value: 'exists',
                key: '_index',
              },
              exists: {
                field: '_index',
              },
            },
            {
              $state: {
                store: 'appState',
              },
              meta: {
                negate: false,
                alias: 'id_exists',
                disabled: false,
                type: 'exists',
                value: 'exists',
                key: '_id',
              },
              exists: {
                field: '_id',
              },
            },
          ],
          created_by: 'patryk_test_user',
          version: 1,
          saved_id: null,
          tags: [],
          rule_id: '2a990c11-f61b-4c8e-b210-da2574e9f9db',
          license: '',
          immutable: false,
          timeline_title: null,
          meta: {
            from: '1m',
            kibana_siem_app_url: 'http://localhost:5601/app/security',
          },
          name: 'Threshold test',
          updated_by: 'patryk_test_user',
          interval: '5m',
          false_positives: [],
          to: 'now',
          threat: [],
          actions: [],
        }),
        [ALERT_ORIGINAL_TIME]: '2021-01-09T13:39:32.595Z',
        [ALERT_ANCESTORS]: [
          {
            depth: 0,
            index:
              'apm-*-transaction*,traces-apm*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,winlogbeat-*',
            id: '0268af90-d8da-576a-9747-2a191519416a',
            type: 'event',
          },
        ],
        [ALERT_WORKFLOW_STATUS]: 'open',
      },
      fields: {
        [`${ALERT_RULE_NAMESPACE}.output_index`]: ['.siem-signals-patrykkopycinski-default'],
        [`${ALERT_RULE_NAMESPACE}.from`]: ['now-360s'],
        [`${ALERT_RULE_NAMESPACE}.language`]: ['kuery'],
        [TIMESTAMP]: ['2021-01-09T13:41:40.517Z'],
        [`${ALERT_RULE_NAMESPACE}.query`]: ['_id :*'],
        [`${ALERT_RULE_NAMESPACE}.type`]: ['threshold'],
        [`${ALERT_RULE_NAMESPACE}.id`]: ['696c24e0-526d-11eb-836c-e1620268b945'],
        [`${ALERT_RULE_NAMESPACE}.risk_score`]: [21],
        [ALERT_WORKFLOW_STATUS]: ['open'],
        [EVENT_KIND]: ['signal'],
        [ALERT_ORIGINAL_TIME]: ['2021-01-09T13:39:32.595Z'],
        [`${ALERT_RULE_NAMESPACE}.severity`]: ['low'],
        [`${ALERT_RULE_NAMESPACE}.version`]: ['1'],
        [`${ALERT_RULE_NAMESPACE}.index`]: [
          'apm-*-transaction*',
          'traces-apm*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'packetbeat-*',
          'winlogbeat-*',
        ],
        [`${ALERT_RULE_NAMESPACE}.name`]: ['Threshold test'],
        [`${ALERT_RULE_NAMESPACE}.to`]: ['now'],
      },
      _type: '',
      sort: ['1610199700517'],
    };

    expect(
      await formatTimelineData(
        [TIMESTAMP, 'host.name', 'destination.ip', 'source.ip'],
        TIMELINE_EVENTS_FIELDS,
        response
      )
    ).toEqual({
      cursor: {
        tiebreaker: null,
        value: '',
      },
      node: {
        _id: 'a77040f198355793c35bf22b900902371309be615381f0a2ec92c208b6132562',
        _index: '.siem-signals-patrykkopycinski-default-000007',
        data: [
          {
            field: TIMESTAMP,
            value: ['2021-01-09T13:41:40.517Z'],
          },
        ],
        ecs: {
          [TIMESTAMP]: ['2021-01-09T13:41:40.517Z'],
          timestamp: '2021-01-09T13:41:40.517Z',
          _id: 'a77040f198355793c35bf22b900902371309be615381f0a2ec92c208b6132562',
          _index: '.siem-signals-patrykkopycinski-default-000007',
          event: {
            kind: ['signal'],
          },
          signal: {
            original_time: ['2021-01-09T13:39:32.595Z'],
            status: ['open'],
            threshold_result: ['{"count":10000,"value":"2a990c11-f61b-4c8e-b210-da2574e9f9db"}'],
            rule: {
              building_block_type: [],
              exceptions_list: [],
              from: ['now-360s'],
              id: ['696c24e0-526d-11eb-836c-e1620268b945'],
              index: [
                'apm-*-transaction*',
                'traces-apm*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'logs-*',
                'packetbeat-*',
                'winlogbeat-*',
              ],
              language: ['kuery'],
              name: ['Threshold test'],
              output_index: ['.siem-signals-patrykkopycinski-default'],
              risk_score: ['21'],
              query: ['_id :*'],
              severity: ['low'],
              to: ['now'],
              type: ['threshold'],
              version: ['1'],
              timeline_id: [],
              timeline_title: [],
              saved_id: [],
              note: [],
              threshold: [
                JSON.stringify({
                  field: '',
                  value: 200,
                }),
              ],
              filters: [
                JSON.stringify({
                  $state: {
                    store: 'appState',
                  },
                  meta: {
                    negate: false,
                    alias: null,
                    disabled: false,
                    type: 'exists',
                    value: 'exists',
                    key: '_index',
                  },
                  exists: {
                    field: '_index',
                  },
                }),
                JSON.stringify({
                  $state: {
                    store: 'appState',
                  },
                  meta: {
                    negate: false,
                    alias: 'id_exists',
                    disabled: false,
                    type: 'exists',
                    value: 'exists',
                    key: '_id',
                  },
                  exists: {
                    field: '_id',
                  },
                }),
              ],
            },
          },
        },
      },
    });
  });

  describe('buildObjectForFieldPath', () => {
    it('builds an object from a single non-nested field', () => {
      expect(buildObjectForFieldPath(TIMESTAMP, eventHit)).toEqual({
        [TIMESTAMP]: ['2020-11-17T14:48:08.922Z'],
      });
    });

    it('builds an object with no fields response', () => {
      const { fields, ...fieldLessHit } = eventHit;
      // @ts-expect-error fieldLessHit is intentionally missing fields
      expect(buildObjectForFieldPath(TIMESTAMP, fieldLessHit)).toEqual({
        [TIMESTAMP]: [],
      });
    });

    it('does not misinterpret non-nested fields with a common prefix', () => {
      // @ts-expect-error hit is minimal
      const hit: EventHit = {
        fields: {
          'foo.bar': ['baz'],
          'foo.barBaz': ['foo'],
        },
      };

      expect(buildObjectForFieldPath('foo.barBaz', hit)).toEqual({
        foo: { barBaz: ['foo'] },
      });
    });

    it('builds an array of objects from a nested field', () => {
      // @ts-expect-error hit is minimal
      const hit: EventHit = {
        fields: {
          foo: [{ bar: ['baz'] }],
        },
      };
      expect(buildObjectForFieldPath('foo.bar', hit)).toEqual({
        foo: [{ bar: ['baz'] }],
      });
    });

    it('builds intermediate objects for nested fields', () => {
      // @ts-expect-error nestedHit is minimal
      const nestedHit: EventHit = {
        fields: {
          'foo.bar': [
            {
              baz: ['host.name'],
            },
          ],
        },
      };
      expect(buildObjectForFieldPath('foo.bar.baz', nestedHit)).toEqual({
        foo: {
          bar: [
            {
              baz: ['host.name'],
            },
          ],
        },
      });
    });

    it('builds intermediate objects at multiple levels', () => {
      expect(buildObjectForFieldPath('threat.enrichments.matched.atomic', eventHit)).toEqual({
        threat: {
          enrichments: [
            {
              matched: {
                atomic: ['matched_atomic'],
              },
            },
            {
              matched: {
                atomic: ['matched_atomic_2'],
              },
            },
          ],
        },
      });
    });

    it('preserves multiple values for a single leaf', () => {
      expect(buildObjectForFieldPath('threat.enrichments.matched.field', eventHit)).toEqual({
        threat: {
          enrichments: [
            {
              matched: {
                field: ['matched_field', 'other_matched_field'],
              },
            },
            {
              matched: {
                field: ['matched_field_2'],
              },
            },
          ],
        },
      });
    });

    describe('multiple levels of nested fields', () => {
      let nestedHit: EventHit;

      beforeEach(() => {
        // @ts-expect-error nestedHit is minimal
        nestedHit = {
          fields: {
            'nested_1.foo': [
              {
                'nested_2.bar': [
                  { leaf: ['leaf_value'], leaf_2: ['leaf_2_value'] },
                  { leaf_2: ['leaf_2_value_2', 'leaf_2_value_3'] },
                ],
              },
              {
                'nested_2.bar': [
                  { leaf: ['leaf_value_2'], leaf_2: ['leaf_2_value_4'] },
                  { leaf: ['leaf_value_3'], leaf_2: ['leaf_2_value_5'] },
                ],
              },
            ],
          },
        };
      });

      it('includes objects without the field', () => {
        expect(buildObjectForFieldPath('nested_1.foo.nested_2.bar.leaf', nestedHit)).toEqual({
          nested_1: {
            foo: [
              {
                nested_2: {
                  bar: [{ leaf: ['leaf_value'] }, { leaf: [] }],
                },
              },
              {
                nested_2: {
                  bar: [{ leaf: ['leaf_value_2'] }, { leaf: ['leaf_value_3'] }],
                },
              },
            ],
          },
        });
      });

      it('groups multiple leaf values', () => {
        expect(buildObjectForFieldPath('nested_1.foo.nested_2.bar.leaf_2', nestedHit)).toEqual({
          nested_1: {
            foo: [
              {
                nested_2: {
                  bar: [
                    { leaf_2: ['leaf_2_value'] },
                    { leaf_2: ['leaf_2_value_2', 'leaf_2_value_3'] },
                  ],
                },
              },
              {
                nested_2: {
                  bar: [{ leaf_2: ['leaf_2_value_4'] }, { leaf_2: ['leaf_2_value_5'] }],
                },
              },
            ],
          },
        });
      });
    });
  });
});
