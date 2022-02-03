/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventHit } from '@kbn/securitysolution-t-grid';
import { EventHit } from '../../../../../common/search_strategy';
import { TIMELINE_EVENTS_FIELDS } from './constants';
import { formatTimelineData } from './format_timeline_data';

describe('formatTimelineData', () => {
  it('should properly format the timeline data', async () => {
    const res = await formatTimelineData(
      [
        '@timestamp',
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
            field: '@timestamp',
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
            enrichments: [
              {
                feed: { name: [] },
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
                feed: { name: [] },
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

  it('should properly format the rule signal results', async () => {
    const response: EventHit = {
      _index: '.siem-signals-patrykkopycinski-default-000007',
      _id: 'a77040f198355793c35bf22b900902371309be615381f0a2ec92c208b6132562',
      _score: 0,
      _source: {
        kibana: {
          alert: {
            threshold_result: {
              count: 10000,
              value: '2a990c11-f61b-4c8e-b210-da2574e9f9db',
            },
            depth: 1,
            _meta: {
              version: 14,
            },
            severity: 'low',
            risk_score: 21,
            rule: {
              note: null,
              throttle: null,
              references: [],
              description: 'asdasd',
              created_at: '2021-01-09T11:25:45.046Z',
              building_block_type: null,
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
              author: [],
              created_by: 'patryk_test_user',
              version: 1,
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
                  'apm-*-transaction*,traces-apm*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,winlogbeat-*',
                id: '0268af90-d8da-576a-9747-2a191519416a',
                type: 'event',
              },
            ],
            workflow_status: 'open',
          },
        },
      },
      fields: {
        'kibana.alert.rule.from': ['now-360s'],
        '@timestamp': ['2021-01-09T13:41:40.517Z'],
        'kibana.alert.rule.type': ['threshold'],
        'kibana.alert.rule.uuid': ['696c24e0-526d-11eb-836c-e1620268b945'],
        'kibana.alert.risk_score': [21],
        'kibana.alert.workflow_status': ['open'],
        'event.kind': ['signal'],
        'kibana.alert.original_time': ['2021-01-09T13:39:32.595Z'],
        'kibana.alert.severity': ['low'],
        'kibana.alert.rule.version': ['1'],
        'kibana.alert.rule.name': ['Threshold test'],
        'kibana.alert.rule.to': ['now'],
      },
      sort: ['1610199700517'],
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
          kibana: {
            alert: {
              original_time: ['2021-01-09T13:39:32.595Z'],
              workflow_status: ['open'],
              threshold_result: ['{"count":10000,"value":"2a990c11-f61b-4c8e-b210-da2574e9f9db"}'],
              severity: ['low'],
              risk_score: ['21'],
              rule: {
                building_block_type: [],
                exceptions_list: [],
                from: ['now-360s'],
                uuid: ['696c24e0-526d-11eb-836c-e1620268b945'],
                name: ['Threshold test'],
                to: ['now'],
                type: ['threshold'],
                version: ['1'],
                timeline_id: [],
                timeline_title: [],
                note: [],
              },
            },
          },
        },
      },
    });
  });
});
