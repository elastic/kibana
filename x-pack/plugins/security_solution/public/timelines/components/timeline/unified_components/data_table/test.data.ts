/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '../../../../../../common/search_strategy';

export const eventsData: TimelineItem[] = [
  {
    ecs: {
      _id: '5d8de53d9afe7cec9d674f7d6882560ad143480698a2920900d628c18552898f',
      timestamp: '2024-02-14T09:16:10.327Z',
      _index: '.internal.alerts-security.alerts-default-000001',
      kibana: {
        alert: {
          rule: {
            from: ['now-6060s'],
            name: ['CAtch All'],
            to: ['now'],
            uuid: ['6ec63433-e14d-42ec-9d37-29d7c0bd9705'],
            rule_id: ['3fb2916d-3681-42fc-8537-ec81010b58ee'],
            type: ['query'],
            version: ['1'],
            parameters: {
              severity_mapping: [],
              references: [],
              description: 'CAtch All',
              language: 'kuery',
              type: 'query',
              exceptions_list: [],
              from: 'now-6060s',
              severity: 'low',
              max_signals: 100,
              risk_score: 21,
              risk_score_mapping: [],
              author: [],
              query: '*',
              index: [
                'apm-*-transaction*',
                'auditbeat-*',
                'endgame-*',
                'filebeat-*',
                'logs-*',
                'packetbeat-*',
                'traces-apm*',
                'winlogbeat-*',
                '-*elastic-cloud-logs-*',
              ],
              filters: [],
              version: 1,
              rule_id: '3fb2916d-3681-42fc-8537-ec81010b58ee',
              license: '',
              required_fields: [],
              immutable: false,
              related_integrations: [],
              meta: { from: '100m', kibana_siem_app_url: 'http://localhost:5601/app/security' },
              setup: '',
              false_positives: [],
              threat: [],
              to: 'now',
            },
          },
          ancestors: {
            index: '.ds-logs-endpoint.events.process-default-2024.02.14-000001',
          },
          workflow_assignee_ids: ['u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0'],
          workflow_status: ['open'],
          original_time: ['2024-02-14T09:15:22.812Z'],
          severity: ['low'],
        },
      },
      event: {
        category: ['authentication', 'session'],
        id: ['b03803e3-0800-4149-bbc2-ea9a4334bea6'],
        kind: ['signal'],
        outcome: ['failure'],
        type: ['start'],
      },
      host: {
        name: ['Host-zckg6ezxy6'],
        os: {
          family: ['debian'],
          name: ['Linux'],
        },
        id: ['e08fb0fb-88a9-4187-89e1-ad744643e83b'],
        ip: ['10.150.209.5'],
      },
      user: {
        name: ['angcqrfgct'],
        domain: ['cci05abfrt'],
      },
      agent: {
        type: ['endpoint'],
        id: ['b98e82c8-067d-4ae3-ac05-6f9ed4abaf5f'],
      },
      process: {
        hash: {
          md5: ['58fd6368-4e37-4099-b372-bcc011418c2b'],
        },
        parent: {
          pid: [2680],
        },
        pid: [4055],
        name: ['notepad.exe'],
        args: ['"C:\\notepad.exe"', '--0z2'],
        entity_id: ['ma62qvs0vh'],
        executable: ['C:\\notepad.exe'],
        working_directory: ['/home/angcqrfgct/'],
        entry_leader: {
          entity_id: ['6ykz6hr912'],
          name: ['fake entry'],
          pid: ['957'],
          start: ['1970-01-01T00:00:00.000Z'],
        },
        session_leader: {
          entity_id: ['6ykz6hr912'],
          name: ['fake session'],
          pid: ['238'],
        },
        group_leader: {
          entity_id: ['6ykz6hr912'],
          name: ['fake leader'],
          pid: ['171'],
        },
      },
    },
    data: [
      {
        field: '@timestamp',
        value: ['2024-02-14T09:16:10.327Z'],
      },
      {
        field: 'kibana.alert.workflow_assignee_ids',
        value: ['u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0'],
      },
      {
        field: 'kibana.alert.workflow_status',
        value: ['open'],
      },
      {
        field: 'kibana.alert.original_time',
        value: ['2024-02-14T09:15:22.812Z'],
      },
      {
        field: 'kibana.alert.rule.from',
        value: ['now-6060s'],
      },
      {
        field: 'kibana.alert.rule.name',
        value: ['CAtch All'],
      },
      {
        field: 'kibana.alert.rule.to',
        value: ['now'],
      },
      {
        field: 'kibana.alert.rule.uuid',
        value: ['6ec63433-e14d-42ec-9d37-29d7c0bd9705'],
      },
      {
        field: 'kibana.alert.rule.rule_id',
        value: ['3fb2916d-3681-42fc-8537-ec81010b58ee'],
      },
      {
        field: 'kibana.alert.rule.type',
        value: ['query'],
      },
      {
        field: 'kibana.alert.original_event.kind',
        value: ['event'],
      },
      {
        field: 'event.category',
        value: ['authentication', 'session'],
      },
      {
        field: 'host.name',
        value: ['Host-zckg6ezxy6'],
      },
      {
        field: 'user.name',
        value: ['angcqrfgct'],
      },
      {
        field: 'host.os.family',
        value: ['debian'],
      },
      {
        field: 'process.entry_leader.entity_id',
        value: ['6ykz6hr912'],
      },
    ],
    _id: '5d8de53d9afe7cec9d674f7d6882560ad143480698a2920900d628c18552898f',
    _index: '.internal.alerts-security.alerts-default-000001',
  },
];
