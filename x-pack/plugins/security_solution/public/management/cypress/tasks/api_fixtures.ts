/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleCreateProps,
  RuleResponse,
} from '../../../../common/detection_engine/rule_schema';
import { request } from './common';

export const generateRandomStringName = (length: number) =>
  Array.from({ length }, () => Math.random().toString(36).substring(2));

export const cleanupRule = (id: string) => {
  request({ method: 'DELETE', url: `/api/detection_engine/rules?id=${id}` });
};

export const loadRule = () =>
  request<RuleResponse>({
    method: 'POST',
    body: {
      type: 'query',
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
      language: 'kuery',
      query: '_id:*',
      author: [],
      false_positives: [],
      references: [],
      risk_score: 21,
      risk_score_mapping: [],
      severity: 'low',
      severity_mapping: [],
      threat: [],
      name: `Test rule ${generateRandomStringName(1)[0]}`,
      description: 'Test rule',
      tags: [],
      license: '',
      interval: '1m',
      from: 'now-120s',
      to: 'now',
      meta: { from: '1m', kibana_siem_app_url: 'http://localhost:5620/app/security' },
      actions: [],
      enabled: true,
      throttle: 'no_actions',
      response_actions: [
        { params: { command: 'isolate', comment: 'Isolate host' }, action_type_id: '.endpoint' },
      ],
    } as RuleCreateProps,
    url: `/api/detection_engine/rules`,
  }).then((response) => response.body);
