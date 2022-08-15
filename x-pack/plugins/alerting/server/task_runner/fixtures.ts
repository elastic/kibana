/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { Rule, RuleTypeParams, RecoveredActionGroup } from '../../common';
import { getDefaultRuleMonitoring } from './task_runner';
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

export const generateSavedObjectParams = ({
  error = null,
  warning = null,
  status = 'ok',
}: {
  error?: null | { reason: string; message: string };
  warning?: null | { reason: string; message: string };
  status?: string;
}) => [
  'alert',
  '1',
  {
    monitoring: {
      execution: {
        calculated_metrics: {
          success_ratio: 1,
        },
        history: [
          {
            success: true,
            timestamp: 0,
          },
        ],
      },
    },
    executionStatus: {
      error,
      lastDuration: 0,
      lastExecutionDate: '1970-01-01T00:00:00.000Z',
      status,
      warning,
    },
  },
  { refresh: false, namespace: undefined },
];

export const GENERIC_ERROR_MESSAGE = 'GENERIC ERROR MESSAGE';

export const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
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
  monitoring: getDefaultRuleMonitoring(),
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

export const generateAlertOpts = ({ action, group, subgroup, state, id }: GeneratorParams = {}) => {
  id = id ?? '1';
  let message: string = '';
  switch (action) {
    case EVENT_LOG_ACTIONS.newInstance:
      message = `test:1: 'rule-name' created new alert: '${id}'`;
      break;
    case EVENT_LOG_ACTIONS.activeInstance:
      message = subgroup
        ? `test:1: 'rule-name' active alert: '${id}' in actionGroup(subgroup): 'default(${subgroup})'`
        : `test:1: 'rule-name' active alert: '${id}' in actionGroup: 'default'`;
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
    ...(subgroup ? { subgroup } : {}),
  };
};

export const generateActionOpts = ({
  subgroup,
  id,
  alertGroup,
  alertId,
}: GeneratorParams = {}) => ({
  id: id ?? '1',
  typeId: 'action',
  alertId: alertId ?? '1',
  alertGroup: alertGroup ?? 'default',
  ...(subgroup ? { alertSubgroup: subgroup } : {}),
});

export const generateRunnerResult = ({
  successRatio = 1,
  history = Array(false),
  state = false,
  interval = '10s',
  alertInstances = {},
}: GeneratorParams = {}) => {
  return {
    monitoring: {
      execution: {
        calculated_metrics: {
          success_ratio: successRatio,
        },
        // @ts-ignore
        history: history.map((success) => ({ success, timestamp: 0 })),
      },
    },
    schedule: {
      interval,
    },
    state: {
      ...(state && { alertInstances }),
      ...(state && { alertTypeState: undefined }),
      ...(state && { previousStartedAt: new Date('1970-01-01T00:00:00.000Z') }),
    },
  };
};

export const generateEnqueueFunctionInput = (isArray: boolean = false) => {
  const input = {
    apiKey: 'MTIzOmFiYw==',
    executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
    id: '1',
    params: {
      foo: true,
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
  return isArray ? [input] : input;
};

export const generateAlertInstance = ({ id, duration, start }: GeneratorParams = { id: 1 }) => ({
  [String(id)]: {
    meta: {
      lastScheduledActions: {
        date: new Date(DATE_1970),
        group: 'default',
        subgroup: undefined,
      },
    },
    state: {
      bar: false,
      duration,
      start,
    },
  },
});
