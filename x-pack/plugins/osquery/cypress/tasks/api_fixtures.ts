/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleCreateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import type { CaseResponse } from '@kbn/cases-plugin/common';
import type { LiveQueryDetailsItem } from '../../public/actions/use_live_query_details';
import type { PackSavedObject, PackItem } from '../../public/packs/types';
import type { SavedQuerySO } from '../../public/routes/saved_queries/list';
import { generateRandomStringName } from './integrations';
import { request } from './common';

export const savedQueryFixture = {
  id: generateRandomStringName(1)[0],
  description: 'Test saved query description',
  ecs_mapping: { labels: { field: 'hours' } },
  interval: '3600',
  query: 'select * from uptime;',
  platform: 'linux,darwin',
};

export const packFixture = () => ({
  description: generateRandomStringName(1)[0],
  enabled: true,
  name: generateRandomStringName(1)[0],
  queries: {
    [generateRandomStringName(1)[0]]: {
      ecs_mapping: {},
      interval: 3600,
      query: 'select * from uptime;',
    },
  },
});

export const multiQueryPackFixture = () => ({
  description: generateRandomStringName(1)[0],
  enabled: true,
  name: generateRandomStringName(1)[0],
  queries: {
    [generateRandomStringName(1)[0]]: {
      ecs_mapping: {},
      interval: 3600,
      platform: 'linux',
      query: 'SELECT * FROM memory_info;',
    },
    [generateRandomStringName(1)[0]]: {
      ecs_mapping: {},
      interval: 3600,
      platform: 'linux,windows,darwin',
      query: 'SELECT * FROM system_info;',
    },
    [generateRandomStringName(1)[0]]: {
      ecs_mapping: {},
      interval: 10,
      query: 'select opera_extensions.* from users join opera_extensions using (uid);',
    },
  },
});

export const loadSavedQuery = () =>
  request<{ data: SavedQuerySO }>({
    method: 'POST',
    body: savedQueryFixture,
    url: '/api/osquery/saved_queries',
  }).then((response) => response.body.data);

export const cleanupSavedQuery = (id: string) => {
  request({ method: 'DELETE', url: `/api/osquery/saved_queries/${id}` });
};

export const loadPack = (payload: Partial<PackItem> = {}) =>
  request<{ data: PackSavedObject }>({
    method: 'POST',
    body: {
      ...payload,
      name: payload.name ?? generateRandomStringName(1)[0],
      shards: {},
      queries: payload.queries ?? {},
    },
    url: `/api/osquery/packs`,
  }).then((response) => response.body.data);

export const cleanupPack = (id: string) => {
  request({ method: 'DELETE', url: `/api/osquery/packs/${id}` });
};

export const loadLiveQuery = () =>
  request<{
    data: LiveQueryDetailsItem & { queries: NonNullable<LiveQueryDetailsItem['queries']> };
  }>({
    method: 'POST',
    body: {
      agent_all: true,
      query: 'select * from uptime;',
    },
    url: `/api/osquery/live_queries`,
  }).then((response) => response.body.data);

export const loadRule = (includeResponseActions = false) =>
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
      note: '!{osquery{"query":"SELECT * FROM os_version where name=\'{{host.os.name}}\';","label":"Get processes","ecs_mapping":{"host.os.platform":{"field":"platform"}}}}\n\n!{osquery{"query":"select * from users;","label":"Get users"}}',
      ...(includeResponseActions
        ? {
            response_actions: [
              {
                params: {
                  query: "SELECT * FROM os_version where name='{{host.os.name}}';",
                  ecs_mapping: {
                    'host.os.platform': {
                      field: 'platform',
                    },
                  },
                },
                action_type_id: '.osquery',
              },
              {
                params: {
                  query: 'select * from users;',
                },
                action_type_id: '.osquery',
              },
            ],
          }
        : {}),
    } as RuleCreateProps,
    url: `/api/detection_engine/rules`,
  }).then((response) => response.body);

export const cleanupRule = (id: string) => {
  request({ method: 'DELETE', url: `/api/detection_engine/rules?rule_id=${id}` });
};

export const loadPolicy = () =>
  request<{ item: AgentPolicy }>({
    method: 'POST',
    body: {
      name: generateRandomStringName(1)[0],
      description: '',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
      inactivity_timeout: 1209600,
    },
    url: '/api/fleet/agent_policies',
  }).then((response) => response.body.item);

export const cleanupPolicy = (agentPolicyId: string) =>
  request({ method: 'POST', body: { agentPolicyId }, url: '/api/fleet/agent_policies/delete' });

export const loadCase = () =>
  request<CaseResponse>({
    method: 'POST',
    body: {
      assignees: [],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      description: 'Test security description',
      owner: 'securitySolution',
      settings: {
        syncAlerts: true,
      },
      severity: 'low',
      tags: ['security'],
      title: generateRandomStringName(1)[0],
    },
    url: '/api/cases',
  }).then((response) => response.body);

export const cleanupCase = (id: string) => {
  request({ method: 'DELETE', url: `/api/cases?ids=["${id}"]` });
};
