/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventHit } from '../../../../../../common/search_strategy';
import { TIMELINE_EVENTS_FIELDS } from './constants';
import { formatTimelineData } from './helpers';

describe('#formatTimelineData', () => {
  it('happy path', () => {
    const response: EventHit = {
      _index: 'auditbeat-7.8.0-2020.11.05-000003',
      _id: 'tkCt1nUBaEgqnrVSZ8R_',
      _score: 0,
      _type: '',
      fields: {
        'event.category': ['process'],
        'process.ppid': [3977],
        'user.name': ['jenkins'],
        'process.args': ['go', 'vet', './...'],
        message: ['Process go (PID: 4313) by user jenkins STARTED'],
        'process.pid': [4313],
        'process.working_directory': [
          '/var/lib/jenkins/workspace/Beats_beats_PR-22624/src/github.com/elastic/beats/libbeat',
        ],
        'process.entity_id': ['Z59cIkAAIw8ZoK0H'],
        'host.ip': ['10.224.1.237', 'fe80::4001:aff:fee0:1ed', '172.17.0.1'],
        'process.name': ['go'],
        'event.action': ['process_started'],
        'agent.type': ['auditbeat'],
        '@timestamp': ['2020-11-17T14:48:08.922Z'],
        'event.module': ['system'],
        'event.type': ['start'],
        'host.name': ['beats-ci-immutable-ubuntu-1804-1605624279743236239'],
        'process.hash.sha1': ['1eac22336a41e0660fb302add9d97daa2bcc7040'],
        'host.os.family': ['debian'],
        'event.kind': ['event'],
        'host.id': ['e59991e835905c65ed3e455b33e13bd6'],
        'event.dataset': ['process'],
        'process.executable': [
          '/var/lib/jenkins/workspace/Beats_beats_PR-22624/.gvm/versions/go1.14.7.linux.amd64/bin/go',
        ],
      },
      _source: {},
      sort: ['1605624488922', 'beats-ci-immutable-ubuntu-1804-1605624279743236239'],
      aggregations: {},
    };

    expect(
      formatTimelineData(
        ['@timestamp', 'host.name', 'destination.ip', 'source.ip'],
        TIMELINE_EVENTS_FIELDS,
        response
      )
    ).toEqual({
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
        },
      },
    });
  });

  it('rule signal results', () => {
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
      formatTimelineData(
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
