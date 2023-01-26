/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { DecoratorFn } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { HttpStart, HttpFetchOptions, HttpHandler } from '@kbn/core/public';
import {
  mockLogResponse,
  getMockLogResponse,
} from '../../public/application/sections/rule_details/components/test_helpers';

const getMockRule = () => {
  const id = uuidv4();
  return {
    id,
    name: `test rule - ${id}`,
    tags: ['tag1', 'tag2', 'tag3'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '1s' },
    actions: [],
    consumer: 'alerts',
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'active',
      lastDuration: 500,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      error: null,
    },
    monitoring: {
      run: {
        history: [
          {
            success: true,
            duration: 1000000,
          },
          {
            success: true,
            duration: 200000,
          },
          {
            success: false,
            duration: 300000,
          },
        ],
        calculated_metrics: {
          success_ratio: 0.66,
          p50: 200000,
          p95: 300000,
          p99: 300000,
        },
      },
    },
  };
};

const mockRuleTypes = [
  {
    id: 'test_rule_type',
    name: 'some rule type',
    action_groups: [{ id: 'default', name: 'Default' }],
    recovery_action_group: { id: 'recovered', name: 'Recovered' },
    action_variables: { context: [], state: [] },
    default_action_group_id: 'default',
    producer: 'alerts',
    minimum_license_required: 'basic',
    enabled_in_license: true,
    authorized_consumers: {
      alerts: { read: true, all: true },
    },
    rule_task_timeout: '1m',
  },
];

const mockConfig = {
  minimumScheduleInterval: {
    value: '1m',
    enforce: false,
  },
  isUsingSecurity: true,
};

const mockConnectorTypes = [
  {
    id: 'test',
    name: 'Test',
  },
  {
    id: 'test2',
    name: 'Test2',
  },
];

const mockHealth = {
  isAlertsAvailable: true,
};

const mockAggregation = {
  rule_execution_status: { ok: 0, active: 0, error: 0, pending: 0, unknown: 0, warning: 0 },
  rule_enabled_status: { enabled: 0, disabled: 0 },
  rule_muted_status: { muted: 0, unmuted: 0 },
  rule_snoozed_status: { snoozed: 0 },
  rule_tags: ['a', 'b'],
};

const mockConnectors: any[] = [];

const mockRuleSummary = {
  id: 'rule-id',
  name: 'rule-name',
  tags: ['tag-1', 'tag-2'],
  rule_type_id: 'test-rule-type-id',
  consumer: 'rule-consumer',
  status: 'OK',
  mute_all: false,
  throttle: '',
  enabled: true,
  error_messages: [],
  status_start_date: '2022-03-21T07:40:46-07:00',
  status_end_date: '2022-03-25T07:40:46-07:00',
  alerts: {
    foo: {
      status: 'OK',
      muted: false,
      actionGroupId: 'testActionGroup',
    },
  },
  execution_duration: {
    average: 100,
    valuesWithTimestamp: {},
  },
};

const getMockErrorLog = () => {
  return {
    id: '66b9c04a-d5d3-4ed4-aa7c-94ddaca3ac1d',
    timestamp: '2022-03-31T18:03:33.133Z',
    type: 'alerting',
    message:
      "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
  };
};

const baseRulesListGetResponse = (path: string) => {
  if (path === '/internal/triggers_actions_ui/_config') {
    return mockConfig;
  }
  if (path === '/internal/triggers_actions_ui/_health') {
    return mockHealth;
  }
  if (path === '/api/actions/connectors') {
    return mockConnectors;
  }
  if (path === '/api/alerting/rule_types') {
    return mockRuleTypes;
  }
  if (path === '/api/actions/connector_types') {
    return mockConnectorTypes;
  }
  if (path === '/internal/alerting/rules/_aggregate') {
    return mockAggregation;
  }
};

const emptyRulesListGetResponse = (path: string) => {
  if (path === '/internal/alerting/rules/_find') {
    return {
      data: [],
      page: 1,
      per_page: 10,
      total: 0,
    };
  }
  return baseRulesListGetResponse(path);
};

const rulesListGetResponse = (path: string) => {
  if (path === '/internal/alerting/rules/_find') {
    return {
      data: [getMockRule(), getMockRule(), getMockRule(), getMockRule()],
      page: 1,
      per_page: 10,
      total: 4,
    };
  }
  return baseRulesListGetResponse(path);
};

const rulesListGetPaginatedResponse = (path: string) => {
  if (path === '/internal/alerting/rules/_find') {
    return {
      data: Array.from(Array(10), () => getMockRule()),
      page: 1,
      per_page: 10,
      total: 50,
    };
  }
  return baseRulesListGetResponse(path);
};

const baseEventLogListGetResponse = (path: string) => {
  if (path.endsWith('/_alert_summary')) {
    return {
      ...mockRuleSummary,
      execution_duration: {
        ...mockRuleSummary.execution_duration,
        valuesWithTimestamp: {
          '2022-08-18T23:07:28.662Z': 68,
          '2022-08-18T23:07:29.662Z': 59,
          '2022-08-18T23:07:30.662Z': 20,
          '2022-08-18T23:07:31.662Z': 140,
        },
      },
    };
  }
  if (path.endsWith('/_action_error_log')) {
    return {
      errors: Array.from(Array(4), () => getMockErrorLog()),
      totalErrors: 4,
    };
  }
  if (path.endsWith('/_execution_kpi')) {
    return {
      activeAlerts: 49,
      erroredActions: 36,
      failure: 30,
      newAlerts: 1,
      recoveredAlerts: 20,
      success: 49,
      triggeredActions: 49,
      unknown: 10,
    };
  }
};

const emptyEventLogListGetResponse = (path: string) => {
  if (path.endsWith('/_alert_summary')) {
    return mockRuleSummary;
  }
  if (path.endsWith('/_execution_log')) {
    return {
      data: [],
      total: 0,
    };
  }
  return baseEventLogListGetResponse(path);
};

const eventLogListGetResponse = (path: string) => {
  if (path.endsWith('/_execution_log')) {
    return mockLogResponse;
  }
  return baseEventLogListGetResponse(path);
};

const paginatedEventLogListGetResponse = (path: string) => {
  if (path.endsWith('/_execution_log')) {
    return {
      data: Array.from(Array(10), () => getMockLogResponse()),
      total: 500,
    };
  }
  return baseEventLogListGetResponse(path);
};

const rulesSettingsGetResponse = (path: string) => {
  if (path.endsWith('/settings/_flapping')) {
    return {
      enabled: true,
      lookBackWindow: 20,
      statusChangeThreshold: 4,
    };
  }
};

const rulesSettingsIds = [
  'app-rulessettingslink--with-all-permission',
  'app-rulessettingslink--with-read-permission',
];

export const getHttp = (context: Parameters<DecoratorFn>[1]) => {
  return {
    get: (async (path: string, options: HttpFetchOptions) => {
      const { id } = context;
      if (id === 'app-ruleslist--empty') {
        return emptyRulesListGetResponse(path);
      }
      if (id === 'app-ruleslist--with-rules') {
        return rulesListGetResponse(path);
      }
      if (id === 'app-ruleslist--with-paginated-rules') {
        return rulesListGetPaginatedResponse(path);
      }
      if (id === 'app-ruleeventloglist--empty') {
        return emptyEventLogListGetResponse(path);
      }
      if (id === 'app-ruleeventloglist--with-events') {
        return eventLogListGetResponse(path);
      }
      if (id === 'app-ruleeventloglist--with-paginated-events') {
        return paginatedEventLogListGetResponse(path);
      }
      if (rulesSettingsIds.includes(id)) {
        return rulesSettingsGetResponse(path);
      }
    }) as HttpHandler,
    post: (async (path: string, options: HttpFetchOptions) => {
      action('POST')(path, options);
      return Promise.resolve();
    }) as HttpHandler,
  } as unknown as HttpStart;
};
