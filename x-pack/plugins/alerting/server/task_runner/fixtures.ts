/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { Rule, RuleTypeParams, RecoveredActionGroup, RuleMonitoring } from '../../common';
import { getDefaultMonitoring } from '../lib/monitoring';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { EVENT_LOG_ACTIONS } from '../plugin';

interface GeneratorParams {
  [key: string]: string | number | boolean | undefined | object[] | boolean[] | object;
}

export const RULE_NAME = 'rule-name';
export const RULE_ID = '1';
export const RULE_TYPE_ID = 'test';
export const DATE_1969 = '1969-12-31T00:00:00.000Z';
export const DATE_1970 = '1970-01-01T00:00:00.000Z';
export const DATE_1970_5_MIN = '1969-12-31T23:55:00.000Z';
export const DATE_9999 = '9999-12-31T12:34:56.789Z';
export const MOCK_DURATION = '86400000000000';

export const SAVED_OBJECT = {
  id: '1',
  type: 'alert',
  attributes: {
    apiKey: Buffer.from('123:abc').toString('base64'),
    consumer: 'bar',
    enabled: true,
  },
  references: [],
};

export const RULE_ACTIONS = [
  {
    actionTypeId: 'action',
    group: 'default',
    id: '1',
    params: {
      foo: true,
    },
  },
  {
    actionTypeId: 'action',
    group: 'recovered',
    id: '2',
    params: {
      isResolved: true,
    },
  },
];

const defaultHistory = [
  {
    success: true,
    timestamp: 0,
  },
];

export const generateSavedObjectParams = ({
  error = null,
  warning = null,
  status = 'ok',
  outcome = 'succeeded',
  nextRun = '1970-01-01T00:00:10.000Z',
  successRatio = 1,
  history = defaultHistory,
  alertsCount,
}: {
  error?: null | { reason: string; message: string };
  warning?: null | { reason: string; message: string };
  status?: string;
  outcome?: string;
  nextRun?: string | null;
  successRatio?: number;
  history?: RuleMonitoring['run']['history'];
  alertsCount?: Record<string, number>;
}) => [
  'alert',
  '1',
  {
    monitoring: {
      run: {
        calculated_metrics: {
          success_ratio: successRatio,
        },
        history,
        last_run: {
          timestamp: '1970-01-01T00:00:00.000Z',
          metrics: {
            gap_duration_s: null,
            total_alerts_created: null,
            total_alerts_detected: null,
            total_indexing_duration_ms: null,
            total_search_duration_ms: null,
          },
        },
      },
    },
    executionStatus: {
      error,
      lastDuration: 0,
      lastExecutionDate: '1970-01-01T00:00:00.000Z',
      status,
      warning,
    },
    lastRun: {
      outcome,
      outcomeMsg:
        (error?.message && [error?.message]) || (warning?.message && [warning?.message]) || null,
      warning: error?.reason || warning?.reason || null,
      alertsCount: {
        active: 0,
        ignored: 0,
        new: 0,
        recovered: 0,
        ...(alertsCount || {}),
      },
    },
    nextRun,
    running: false,
  },
  { refresh: false, namespace: undefined },
];

export const GENERIC_ERROR_MESSAGE = 'GENERIC ERROR MESSAGE';

export const getSummarizedAlertsMock = jest.fn();

export const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  getSummarizedAlerts: getSummarizedAlertsMock,
  id: RULE_TYPE_ID,
  name: 'My test rule',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
  producer: 'alerts',
  cancelAlertsOnRuleTimeout: true,
  ruleTaskTimeout: '5m',
  autoRecoverAlerts: true,
};

export const mockRunNowResponse = {
  id: 1,
} as jest.ResolvedValue<unknown>;

export const mockDate = new Date('2019-02-12T21:01:22.479Z');

export const mockedRuleTypeSavedObject: Rule<RuleTypeParams> = {
  id: '1',
  consumer: 'bar',
  createdAt: mockDate,
  updatedAt: mockDate,
  throttle: null,
  muteAll: false,
  notifyWhen: 'onActiveAlert',
  enabled: true,
  alertTypeId: ruleType.id,
  apiKey: '',
  apiKeyOwner: 'elastic',
  schedule: { interval: '10s' },
  name: RULE_NAME,
  tags: ['rule-', '-tags'],
  createdBy: 'rule-creator',
  updatedBy: 'rule-updater',
  mutedInstanceIds: [],
  params: {
    bar: true,
  },
  actions: [
    {
      group: 'default',
      id: '1',
      actionTypeId: 'action',
      params: {
        foo: true,
      },
    },
    {
      group: RecoveredActionGroup.id,
      id: '2',
      actionTypeId: 'action',
      params: {
        isResolved: true,
      },
    },
  ],
  executionStatus: {
    status: 'unknown',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
  monitoring: getDefaultMonitoring('2020-08-20T19:23:38Z'),
};

export const mockTaskInstance = () => ({
  id: '',
  attempts: 0,
  status: TaskStatus.Running,
  version: '123',
  runAt: new Date(),
  schedule: { interval: '10s' },
  scheduledAt: new Date(),
  startedAt: new Date(),
  retryAt: new Date(Date.now() + 5 * 60 * 1000),
  state: {},
  taskType: 'alerting:test',
  params: {
    alertId: RULE_ID,
    spaceId: 'default',
    consumer: 'bar',
  },
  ownerId: null,
});

export const generateAlertOpts = ({ action, group, state, id }: GeneratorParams = {}) => {
  id = id ?? '1';
  let message: string = '';
  switch (action) {
    case EVENT_LOG_ACTIONS.newInstance:
      message = `test:1: 'rule-name' created new alert: '${id}'`;
      break;
    case EVENT_LOG_ACTIONS.activeInstance:
      message = `test:1: 'rule-name' active alert: '${id}' in actionGroup: 'default'`;
      break;
    case EVENT_LOG_ACTIONS.recoveredInstance:
      message = `test:1: 'rule-name' alert '${id}' has recovered`;
      break;
  }
  return {
    action,
    id,
    message,
    state,
    ...(group ? { group } : {}),
    flapping: false,
  };
};

export const generateActionOpts = ({ id, alertGroup, alertId }: GeneratorParams = {}) => ({
  id: id ?? '1',
  typeId: 'action',
  alertId: alertId ?? '1',
  alertGroup: alertGroup ?? 'default',
});

export const generateRunnerResult = ({
  successRatio = 1,
  history = Array(false),
  state = false,
  interval = '10s',
  alertInstances = {},
  alertRecoveredInstances = {},
  summaryActions = {},
}: GeneratorParams = {}) => {
  return {
    monitoring: {
      run: {
        calculated_metrics: {
          success_ratio: successRatio,
        },
        // @ts-ignore
        history: history.map((success) => ({ success, timestamp: 0 })),
        last_run: {
          metrics: {
            gap_duration_s: null,
            total_alerts_created: null,
            total_alerts_detected: null,
            total_indexing_duration_ms: null,
            total_search_duration_ms: null,
          },
          timestamp: '1970-01-01T00:00:00.000Z',
        },
      },
    },
    schedule: {
      interval,
    },
    state: {
      ...(state && { alertInstances }),
      ...(state && { alertRecoveredInstances }),
      ...(state && { alertTypeState: {} }),
      ...(state && { previousStartedAt: new Date('1970-01-01T00:00:00.000Z') }),
      ...(state && { summaryActions }),
    },
  };
};

export const generateEnqueueFunctionInput = ({
  id = '1',
  isBulk = false,
  isResolved,
  foo,
}: {
  id: string;
  isBulk?: boolean;
  isResolved?: boolean;
  foo?: boolean;
}) => {
  const input = {
    apiKey: 'MTIzOmFiYw==',
    executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
    id,
    params: {
      ...(isResolved !== undefined ? { isResolved } : {}),
      ...(foo !== undefined ? { foo } : {}),
    },
    consumer: 'bar',
    relatedSavedObjects: [
      {
        id: '1',
        namespace: undefined,
        type: 'alert',
        typeId: RULE_TYPE_ID,
      },
    ],
    source: {
      source: {
        id: '1',
        type: 'alert',
      },
      type: 'SAVED_OBJECT',
    },
    spaceId: 'default',
  };
  return isBulk ? [input] : input;
};

export const generateAlertInstance = (
  { id, duration, start, flappingHistory, actions }: GeneratorParams = {
    id: 1,
    flappingHistory: [false],
  }
) => ({
  [String(id)]: {
    meta: {
      lastScheduledActions: {
        date: new Date(DATE_1970),
        group: 'default',
        ...(actions && { actions }),
      },
      flappingHistory,
      flapping: false,
    },
    state: {
      bar: false,
      duration,
      start,
    },
  },
});

export const mockAAD = {
  'kibana.alert.rule.category': 'Metric threshold',
  'kibana.alert.rule.consumer': 'alerts',
  'kibana.alert.rule.execution.uuid': 'c35db7cc-5bf7-46ea-b43f-b251613a5b72',
  'kibana.alert.rule.name': 'test-rule',
  'kibana.alert.rule.producer': 'infrastructure',
  'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
  'kibana.alert.rule.uuid': '0de91960-7643-11ed-b719-bb9db8582cb6',
  'kibana.space_ids': ['default'],
  'kibana.alert.rule.tags': [],
  '@timestamp': '2022-12-07T15:38:43.472Z',
  'kibana.alert.reason': 'system.cpu is 90% in the last 1 min for all hosts. Alert when > 50%.',
  'kibana.alert.duration.us': 100000,
  'kibana.alert.time_range': { gte: '2022-01-01T12:00:00.000Z' },
  'kibana.alert.instance.id': '*',
  'kibana.alert.start': '2022-12-07T15:23:13.488Z',
  'kibana.alert.uuid': '2d3e8fe5-3e8b-4361-916e-9eaab0bf2084',
  'kibana.alert.status': 'active',
  'kibana.alert.workflow_status': 'open',
  'event.kind': 'signal',
  'event.action': 'active',
  'kibana.version': '8.7.0',
  'kibana.alert.flapping': false,
};
