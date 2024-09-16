/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScheduleBackfillResponseBody } from '@kbn/alerting-plugin/server/routes/schemas/backfill/apis/schedule';

export const scheduleRuleRunMock: ScheduleBackfillResponseBody = [
  {
    id: '2d0deaa0-6263-4271-9838-ad0a28facaf0',
    duration: '5m',
    enabled: true,
    end: '2024-05-28T14:30:00.000Z',
    start: '2024-05-28T14:00:00.000Z',
    status: 'pending',
    created_at: '2024-05-28T14:53:14.193Z',
    space_id: 'default',
    rule: {
      name: 'Rule 2',
      tags: [],
      params: {
        author: [],
        description: 'asdasd',
        falsePositives: [],
        from: 'now-360s',
        ruleId: 'c2db9040-2398-4d4c-a683-9ea6478340a6',
        investigationFields: {
          field_names: ['event.category', 'blablabla'],
        },
        immutable: false,
        license: '',
        outputIndex: '',
        meta: {
          from: '1m',
          kibana_siem_app_url: 'http://localhost:5601/sbb/app/security',
        },
        maxSignals: 100,
        riskScore: 21,
        riskScoreMapping: [],
        severity: 'low',
        severityMapping: [],
        threat: [],
        to: 'now',
        references: [],
        version: 3,
        exceptionsList: [],
        relatedIntegrations: [],
        requiredFields: [],
        setup: '',
        type: 'query',
        language: 'kuery',
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
        query: '*',
        filters: [],
      },
      consumer: 'siem',
      enabled: true,
      schedule: {
        interval: '5m',
      },
      revision: 2,
      id: 'b04c2714-1bd2-4925-a2b0-8dddc320c41e',
      rule_type_id: 'siem.queryRule',
      api_key_owner: 'elastic',
      api_key_created_by_user: false,
      created_by: 'elastic',
      created_at: '2024-05-27T09:41:09.269Z',
      updated_by: 'elastic',
      updated_at: '2024-05-28T08:44:06.275Z',
    },
    schedule: [
      {
        run_at: '2024-05-28T14:05:00.000Z',
        status: 'pending',
        interval: '5m',
      },
      {
        run_at: '2024-05-28T14:10:00.000Z',
        status: 'pending',
        interval: '5m',
      },
      {
        run_at: '2024-05-28T14:15:00.000Z',
        status: 'pending',
        interval: '5m',
      },
      {
        run_at: '2024-05-28T14:20:00.000Z',
        status: 'pending',
        interval: '5m',
      },
      {
        run_at: '2024-05-28T14:25:00.000Z',
        status: 'pending',
        interval: '5m',
      },
      {
        run_at: '2024-05-28T14:30:00.000Z',
        status: 'pending',
        interval: '5m',
      },
    ],
  },
];
