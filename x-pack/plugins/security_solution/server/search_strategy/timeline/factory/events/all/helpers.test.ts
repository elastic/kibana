/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventHit } from '../../../../../../common/utils/mock_event_details';
import { EventHit } from '../../../../../../common/search_strategy';
import { TIMELINE_EVENTS_FIELDS } from './constants';
import { buildFieldsRequest, buildObjectForFieldPath, formatTimelineData } from './helpers';

describe('search strategy timeline helpers', () => {
  describe('#formatTimelineData', () => {
    it('happy path', async () => {
      const res = await formatTimelineData(
        [
          '@timestamp',
          'host.name',
          'destination.ip',
          'source.ip',
          'source.geo.location',
          'threat.indicator.matched.field',
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
              field: '@timestamp',
              value: ['2020-11-17T14:48:08.922Z'],
            },
            {
              field: 'host.name',
              value: ['beats-ci-immutable-ubuntu-1804-1605624279743236239'],
            },
            {
              field: 'threat.indicator.matched.field',
              value: ['matched_field', 'other_matched_field', 'matched_field_2'],
            },
            {
              field: 'source.geo.location',
              value: [`{"lon":118.7778,"lat":32.0617}`],
            },
          ],
          ecs: {
            '@timestamp': ['2020-11-17T14:48:08.922Z'],
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
              indicator: [
                {
                  event: {
                    dataset: [],
                    reference: [],
                  },
                  matched: {
                    atomic: ['matched_atomic'],
                    field: ['matched_field', 'other_matched_field'],
                    type: [],
                  },
                  provider: ['yourself'],
                },
                {
                  event: {
                    dataset: [],
                    reference: [],
                  },
                  matched: {
                    atomic: ['matched_atomic_2'],
                    field: ['matched_field_2'],
                    type: [],
                  },
                  provider: ['other_you'],
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
          signal: {
            threshold_result: {
              count: 10000,
              value: '2a990c11-f61b-4c8e-b210-da2574e9f9db',
            },
            parent: {
              depth: 0,
              index:
                'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,winlogbeat-*',
              id: '0268af90-d8da-576a-9747-2a191519416a',
              type: 'event',
            },
            depth: 1,
            _meta: {
              version: 14,
            },
            rule: {
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
              id: '696c24e0-526d-11eb-836c-e1620268b945',
              timeline_id: null,
              max_signals: 100,
              severity: 'low',
              risk_score: 21,
              risk_score_mapping: [],
              author: [],
              query: '_id :*',
              index: [
                'apm-*-transaction*',
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
            },
            original_time: '2021-01-09T13:39:32.595Z',
            ancestors: [
              {
                depth: 0,
                index:
                  'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,winlogbeat-*',
                id: '0268af90-d8da-576a-9747-2a191519416a',
                type: 'event',
              },
            ],
            parents: [
              {
                depth: 0,
                index:
                  'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,winlogbeat-*',
                id: '0268af90-d8da-576a-9747-2a191519416a',
                type: 'event',
              },
            ],
            status: 'open',
          },
        },
        fields: {
          'signal.rule.output_index': ['.siem-signals-patrykkopycinski-default'],
          'signal.rule.from': ['now-360s'],
          'signal.rule.language': ['kuery'],
          '@timestamp': ['2021-01-09T13:41:40.517Z'],
          'signal.rule.query': ['_id :*'],
          'signal.rule.type': ['threshold'],
          'signal.rule.id': ['696c24e0-526d-11eb-836c-e1620268b945'],
          'signal.rule.risk_score': [21],
          'signal.status': ['open'],
          'event.kind': ['signal'],
          'signal.original_time': ['2021-01-09T13:39:32.595Z'],
          'signal.rule.severity': ['low'],
          'signal.rule.version': ['1'],
          'signal.rule.index': [
            'apm-*-transaction*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
          ],
          'signal.rule.name': ['Threshold test'],
          'signal.rule.to': ['now'],
        },
        _type: '',
        sort: ['1610199700517'],
        aggregations: {},
      };

      expect(
        await formatTimelineData(
          ['@timestamp', 'host.name', 'destination.ip', 'source.ip'],
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
              field: '@timestamp',
              value: ['2021-01-09T13:41:40.517Z'],
            },
          ],
          ecs: {
            '@timestamp': ['2021-01-09T13:41:40.517Z'],
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
  });

  describe('#buildObjectForFieldPath', () => {
    it('builds an object from a single non-nested field', () => {
      expect(buildObjectForFieldPath('@timestamp', eventHit)).toEqual({
        '@timestamp': ['2020-11-17T14:48:08.922Z'],
      });
    });

    it('builds an object with no fields response', () => {
      const { fields, ...fieldLessHit } = eventHit;
      // @ts-expect-error fieldLessHit is intentionally missing fields
      expect(buildObjectForFieldPath('@timestamp', fieldLessHit)).toEqual({
        '@timestamp': [],
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
      expect(buildObjectForFieldPath('threat.indicator.matched.atomic', eventHit)).toEqual({
        threat: {
          indicator: [
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
      expect(buildObjectForFieldPath('threat.indicator.matched.field', eventHit)).toEqual({
        threat: {
          indicator: [
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

  describe('#buildFieldsRequest', () => {
    it('happy path', async () => {
      const res = await buildFieldsRequest([
        '@timestamp',
        'host.name',
        'destination.ip',
        'source.ip',
        'source.geo.location',
        'threat.indicator.matched.field',
      ]);
      expect(res).toEqual([
        {
          field: '@timestamp',
          include_unmapped: true,
        },
        {
          field: 'host.name',
          include_unmapped: true,
        },
        {
          field: 'destination.ip',
          include_unmapped: true,
        },
        {
          field: 'source.ip',
          include_unmapped: true,
        },
        {
          field: 'source.geo.location',
          include_unmapped: true,
        },
        {
          field: 'threat.indicator.matched.field',
          include_unmapped: true,
        },
        {
          field: 'signal.status',
          include_unmapped: true,
        },
        {
          field: 'signal.group.id',
          include_unmapped: true,
        },
        {
          field: 'signal.original_time',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.filters',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.from',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.language',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.query',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.name',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.to',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.id',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.index',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.type',
          include_unmapped: true,
        },
        {
          field: 'signal.original_event.kind',
          include_unmapped: true,
        },
        {
          field: 'signal.original_event.module',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.version',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.severity',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.risk_score',
          include_unmapped: true,
        },
        {
          field: 'signal.threshold_result',
          include_unmapped: true,
        },
        {
          field: 'event.code',
          include_unmapped: true,
        },
        {
          field: 'event.module',
          include_unmapped: true,
        },
        {
          field: 'event.action',
          include_unmapped: true,
        },
        {
          field: 'event.category',
          include_unmapped: true,
        },
        {
          field: 'user.name',
          include_unmapped: true,
        },
        {
          field: 'message',
          include_unmapped: true,
        },
        {
          field: 'system.auth.ssh.signature',
          include_unmapped: true,
        },
        {
          field: 'system.auth.ssh.method',
          include_unmapped: true,
        },
        {
          field: 'system.audit.package.arch',
          include_unmapped: true,
        },
        {
          field: 'system.audit.package.entity_id',
          include_unmapped: true,
        },
        {
          field: 'system.audit.package.name',
          include_unmapped: true,
        },
        {
          field: 'system.audit.package.size',
          include_unmapped: true,
        },
        {
          field: 'system.audit.package.summary',
          include_unmapped: true,
        },
        {
          field: 'system.audit.package.version',
          include_unmapped: true,
        },
        {
          field: 'event.created',
          include_unmapped: true,
        },
        {
          field: 'event.dataset',
          include_unmapped: true,
        },
        {
          field: 'event.duration',
          include_unmapped: true,
        },
        {
          field: 'event.end',
          include_unmapped: true,
        },
        {
          field: 'event.hash',
          include_unmapped: true,
        },
        {
          field: 'event.id',
          include_unmapped: true,
        },
        {
          field: 'event.kind',
          include_unmapped: true,
        },
        {
          field: 'event.original',
          include_unmapped: true,
        },
        {
          field: 'event.outcome',
          include_unmapped: true,
        },
        {
          field: 'event.risk_score',
          include_unmapped: true,
        },
        {
          field: 'event.risk_score_norm',
          include_unmapped: true,
        },
        {
          field: 'event.severity',
          include_unmapped: true,
        },
        {
          field: 'event.start',
          include_unmapped: true,
        },
        {
          field: 'event.timezone',
          include_unmapped: true,
        },
        {
          field: 'event.type',
          include_unmapped: true,
        },
        {
          field: 'agent.type',
          include_unmapped: true,
        },
        {
          field: 'auditd.result',
          include_unmapped: true,
        },
        {
          field: 'auditd.session',
          include_unmapped: true,
        },
        {
          field: 'auditd.data.acct',
          include_unmapped: true,
        },
        {
          field: 'auditd.data.terminal',
          include_unmapped: true,
        },
        {
          field: 'auditd.data.op',
          include_unmapped: true,
        },
        {
          field: 'auditd.summary.actor.primary',
          include_unmapped: true,
        },
        {
          field: 'auditd.summary.actor.secondary',
          include_unmapped: true,
        },
        {
          field: 'auditd.summary.object.primary',
          include_unmapped: true,
        },
        {
          field: 'auditd.summary.object.secondary',
          include_unmapped: true,
        },
        {
          field: 'auditd.summary.object.type',
          include_unmapped: true,
        },
        {
          field: 'auditd.summary.how',
          include_unmapped: true,
        },
        {
          field: 'auditd.summary.message_type',
          include_unmapped: true,
        },
        {
          field: 'auditd.summary.sequence',
          include_unmapped: true,
        },
        {
          field: 'file.Ext.original.path',
          include_unmapped: true,
        },
        {
          field: 'file.name',
          include_unmapped: true,
        },
        {
          field: 'file.target_path',
          include_unmapped: true,
        },
        {
          field: 'file.extension',
          include_unmapped: true,
        },
        {
          field: 'file.type',
          include_unmapped: true,
        },
        {
          field: 'file.device',
          include_unmapped: true,
        },
        {
          field: 'file.inode',
          include_unmapped: true,
        },
        {
          field: 'file.uid',
          include_unmapped: true,
        },
        {
          field: 'file.owner',
          include_unmapped: true,
        },
        {
          field: 'file.gid',
          include_unmapped: true,
        },
        {
          field: 'file.group',
          include_unmapped: true,
        },
        {
          field: 'file.mode',
          include_unmapped: true,
        },
        {
          field: 'file.size',
          include_unmapped: true,
        },
        {
          field: 'file.mtime',
          include_unmapped: true,
        },
        {
          field: 'file.ctime',
          include_unmapped: true,
        },
        {
          field: 'file.path',
          include_unmapped: true,
        },
        {
          field: 'file.Ext.code_signature',
          include_unmapped: true,
        },
        {
          field: 'file.Ext.code_signature.subject_name',
          include_unmapped: true,
        },
        {
          field: 'file.Ext.code_signature.trusted',
          include_unmapped: true,
        },
        {
          field: 'file.hash.sha256',
          include_unmapped: true,
        },
        {
          field: 'host.os.family',
          include_unmapped: true,
        },
        {
          field: 'host.id',
          include_unmapped: true,
        },
        {
          field: 'host.ip',
          include_unmapped: true,
        },
        {
          field: 'registry.key',
          include_unmapped: true,
        },
        {
          field: 'registry.path',
          include_unmapped: true,
        },
        {
          field: 'rule.reference',
          include_unmapped: true,
        },
        {
          field: 'source.bytes',
          include_unmapped: true,
        },
        {
          field: 'source.packets',
          include_unmapped: true,
        },
        {
          field: 'source.port',
          include_unmapped: true,
        },
        {
          field: 'source.geo.continent_name',
          include_unmapped: true,
        },
        {
          field: 'source.geo.country_name',
          include_unmapped: true,
        },
        {
          field: 'source.geo.country_iso_code',
          include_unmapped: true,
        },
        {
          field: 'source.geo.city_name',
          include_unmapped: true,
        },
        {
          field: 'source.geo.region_iso_code',
          include_unmapped: true,
        },
        {
          field: 'source.geo.region_name',
          include_unmapped: true,
        },
        {
          field: 'destination.bytes',
          include_unmapped: true,
        },
        {
          field: 'destination.packets',
          include_unmapped: true,
        },
        {
          field: 'destination.port',
          include_unmapped: true,
        },
        {
          field: 'destination.geo.continent_name',
          include_unmapped: true,
        },
        {
          field: 'destination.geo.country_name',
          include_unmapped: true,
        },
        {
          field: 'destination.geo.country_iso_code',
          include_unmapped: true,
        },
        {
          field: 'destination.geo.city_name',
          include_unmapped: true,
        },
        {
          field: 'destination.geo.region_iso_code',
          include_unmapped: true,
        },
        {
          field: 'destination.geo.region_name',
          include_unmapped: true,
        },
        {
          field: 'dns.question.name',
          include_unmapped: true,
        },
        {
          field: 'dns.question.type',
          include_unmapped: true,
        },
        {
          field: 'dns.resolved_ip',
          include_unmapped: true,
        },
        {
          field: 'dns.response_code',
          include_unmapped: true,
        },
        {
          field: 'endgame.exit_code',
          include_unmapped: true,
        },
        {
          field: 'endgame.file_name',
          include_unmapped: true,
        },
        {
          field: 'endgame.file_path',
          include_unmapped: true,
        },
        {
          field: 'endgame.logon_type',
          include_unmapped: true,
        },
        {
          field: 'endgame.parent_process_name',
          include_unmapped: true,
        },
        {
          field: 'endgame.pid',
          include_unmapped: true,
        },
        {
          field: 'endgame.process_name',
          include_unmapped: true,
        },
        {
          field: 'endgame.subject_domain_name',
          include_unmapped: true,
        },
        {
          field: 'endgame.subject_logon_id',
          include_unmapped: true,
        },
        {
          field: 'endgame.subject_user_name',
          include_unmapped: true,
        },
        {
          field: 'endgame.target_domain_name',
          include_unmapped: true,
        },
        {
          field: 'endgame.target_logon_id',
          include_unmapped: true,
        },
        {
          field: 'endgame.target_user_name',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.saved_id',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.timeline_id',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.timeline_title',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.output_index',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.note',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.threshold',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.exceptions_list',
          include_unmapped: true,
        },
        {
          field: 'signal.rule.building_block_type',
          include_unmapped: true,
        },
        {
          field: 'suricata.eve.proto',
          include_unmapped: true,
        },
        {
          field: 'suricata.eve.flow_id',
          include_unmapped: true,
        },
        {
          field: 'suricata.eve.alert.signature',
          include_unmapped: true,
        },
        {
          field: 'suricata.eve.alert.signature_id',
          include_unmapped: true,
        },
        {
          field: 'network.bytes',
          include_unmapped: true,
        },
        {
          field: 'network.community_id',
          include_unmapped: true,
        },
        {
          field: 'network.direction',
          include_unmapped: true,
        },
        {
          field: 'network.packets',
          include_unmapped: true,
        },
        {
          field: 'network.protocol',
          include_unmapped: true,
        },
        {
          field: 'network.transport',
          include_unmapped: true,
        },
        {
          field: 'http.version',
          include_unmapped: true,
        },
        {
          field: 'http.request.method',
          include_unmapped: true,
        },
        {
          field: 'http.request.body.bytes',
          include_unmapped: true,
        },
        {
          field: 'http.request.body.content',
          include_unmapped: true,
        },
        {
          field: 'http.request.referrer',
          include_unmapped: true,
        },
        {
          field: 'http.response.status_code',
          include_unmapped: true,
        },
        {
          field: 'http.response.body.bytes',
          include_unmapped: true,
        },
        {
          field: 'http.response.body.content',
          include_unmapped: true,
        },
        {
          field: 'tls.client_certificate.fingerprint.sha1',
          include_unmapped: true,
        },
        {
          field: 'tls.fingerprints.ja3.hash',
          include_unmapped: true,
        },
        {
          field: 'tls.server_certificate.fingerprint.sha1',
          include_unmapped: true,
        },
        {
          field: 'user.domain',
          include_unmapped: true,
        },
        {
          field: 'winlog.event_id',
          include_unmapped: true,
        },
        {
          field: 'process.exit_code',
          include_unmapped: true,
        },
        {
          field: 'process.hash.md5',
          include_unmapped: true,
        },
        {
          field: 'process.hash.sha1',
          include_unmapped: true,
        },
        {
          field: 'process.hash.sha256',
          include_unmapped: true,
        },
        {
          field: 'process.parent.name',
          include_unmapped: true,
        },
        {
          field: 'process.parent.pid',
          include_unmapped: true,
        },
        {
          field: 'process.pid',
          include_unmapped: true,
        },
        {
          field: 'process.name',
          include_unmapped: true,
        },
        {
          field: 'process.ppid',
          include_unmapped: true,
        },
        {
          field: 'process.args',
          include_unmapped: true,
        },
        {
          field: 'process.entity_id',
          include_unmapped: true,
        },
        {
          field: 'process.executable',
          include_unmapped: true,
        },
        {
          field: 'process.title',
          include_unmapped: true,
        },
        {
          field: 'process.working_directory',
          include_unmapped: true,
        },
        {
          field: 'zeek.session_id',
          include_unmapped: true,
        },
        {
          field: 'zeek.connection.local_resp',
          include_unmapped: true,
        },
        {
          field: 'zeek.connection.local_orig',
          include_unmapped: true,
        },
        {
          field: 'zeek.connection.missed_bytes',
          include_unmapped: true,
        },
        {
          field: 'zeek.connection.state',
          include_unmapped: true,
        },
        {
          field: 'zeek.connection.history',
          include_unmapped: true,
        },
        {
          field: 'zeek.notice.suppress_for',
          include_unmapped: true,
        },
        {
          field: 'zeek.notice.msg',
          include_unmapped: true,
        },
        {
          field: 'zeek.notice.note',
          include_unmapped: true,
        },
        {
          field: 'zeek.notice.sub',
          include_unmapped: true,
        },
        {
          field: 'zeek.notice.dst',
          include_unmapped: true,
        },
        {
          field: 'zeek.notice.dropped',
          include_unmapped: true,
        },
        {
          field: 'zeek.notice.peer_descr',
          include_unmapped: true,
        },
        {
          field: 'zeek.dns.AA',
          include_unmapped: true,
        },
        {
          field: 'zeek.dns.qclass_name',
          include_unmapped: true,
        },
        {
          field: 'zeek.dns.RD',
          include_unmapped: true,
        },
        {
          field: 'zeek.dns.qtype_name',
          include_unmapped: true,
        },
        {
          field: 'zeek.dns.qtype',
          include_unmapped: true,
        },
        {
          field: 'zeek.dns.query',
          include_unmapped: true,
        },
        {
          field: 'zeek.dns.trans_id',
          include_unmapped: true,
        },
        {
          field: 'zeek.dns.qclass',
          include_unmapped: true,
        },
        {
          field: 'zeek.dns.RA',
          include_unmapped: true,
        },
        {
          field: 'zeek.dns.TC',
          include_unmapped: true,
        },
        {
          field: 'zeek.http.resp_mime_types',
          include_unmapped: true,
        },
        {
          field: 'zeek.http.trans_depth',
          include_unmapped: true,
        },
        {
          field: 'zeek.http.status_msg',
          include_unmapped: true,
        },
        {
          field: 'zeek.http.resp_fuids',
          include_unmapped: true,
        },
        {
          field: 'zeek.http.tags',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.session_ids',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.timedout',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.local_orig',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.tx_host',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.source',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.is_orig',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.overflow_bytes',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.sha1',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.duration',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.depth',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.analyzers',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.mime_type',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.rx_host',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.total_bytes',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.fuid',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.seen_bytes',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.missing_bytes',
          include_unmapped: true,
        },
        {
          field: 'zeek.files.md5',
          include_unmapped: true,
        },
        {
          field: 'zeek.ssl.cipher',
          include_unmapped: true,
        },
        {
          field: 'zeek.ssl.established',
          include_unmapped: true,
        },
        {
          field: 'zeek.ssl.resumed',
          include_unmapped: true,
        },
        {
          field: 'zeek.ssl.version',
          include_unmapped: true,
        },
        {
          field: 'threat.indicator.matched.atomic',
          include_unmapped: true,
        },
        {
          field: 'threat.indicator.matched.type',
          include_unmapped: true,
        },
        {
          field: 'threat.indicator.event.dataset',
          include_unmapped: true,
        },
        {
          field: 'threat.indicator.event.reference',
          include_unmapped: true,
        },
        {
          field: 'threat.indicator.provider',
          include_unmapped: true,
        },
      ]);
    });

    it('remove internal attributes starting with _', async () => {
      const res = await buildFieldsRequest([
        '@timestamp',
        '_id',
        'host.name',
        'destination.ip',
        'source.ip',
        'source.geo.location',
        '_type',
        'threat.indicator.matched.field',
      ]);
      expect(res.some((f) => f.field === '_id')).toEqual(false);
      expect(res.some((f) => f.field === '_type')).toEqual(false);
    });
  });
});
