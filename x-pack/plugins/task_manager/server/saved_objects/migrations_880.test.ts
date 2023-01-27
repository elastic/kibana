/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, cloneDeep } from 'lodash';
import type { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { migrationMocks } from '@kbn/core/server/mocks';
import type {
  RuleTaskState,
  WrappedLifecycleRuleState,
  RawAlertInstance,
} from '@kbn/alerting-state-types';

import { getMigrations } from './migrations';
import { SerializedConcreteTaskInstance, TaskStatus } from '../task';

type RawAlertInstances = Record<string, RawAlertInstance>;

const migrationContext = migrationMocks.createContext();
const migration880 = getMigrations()['8.8.0'] as SavedObjectMigrationFn<unknown, { state: string }>;

describe('successful migrations for 8.8.0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('validate test data', () => {
    // the RuleState docs are included to make it easier to read
    // the tests; we validate they are the parsed JSON here
    const mtState = JSON.parse(TaskDocMetricThreshold.task.state);
    expect(mtState).toStrictEqual(RuleStateMetricThreshold);

    const itState = JSON.parse(TaskDocIndexThreshold.task.state);
    expect(itState).toStrictEqual(RuleStateIndexThreshold);
  });

  describe('move rule alert uuid to framework meta', () => {
    test('does not change non-rule tasks', () => {
      const task = getMockData();
      expect(migration880(task, migrationContext)).toEqual(task);
    });

    test('does not change rule task with no state', () => {
      const task = getMockData({ taskType: 'alerting:some-rule-id', state: undefined });
      expect(migration880(task, migrationContext)).toEqual(task);
    });

    test('does not change rule task with empty state', () => {
      const task = getMockData({ taskType: 'alerting:some-rule-id', state: '{}' });
      expect(migration880(task, migrationContext)).toEqual(task);
    });

    test('for non-lifecycle rules, adds new uuid to alert meta', () => {
      const task = getMockData(TaskDocIndexThreshold.task);
      const taskMigrated = migration880(task, migrationContext);
      const state = JSON.parse(taskMigrated.attributes.state) as RuleTaskState;

      checkMetaInRuleTaskState(state, RuleStateIndexThreshold);
    });

    test('for lifecycle rules, copies uuid to alert meta', () => {
      const task = getMockData(TaskDocMetricThreshold.task);
      const taskMigrated = migration880(task, migrationContext);
      const state = JSON.parse(taskMigrated.attributes.state);

      checkMetaInRuleTaskStateWrapped(state, RuleStateMetricThreshold);
    });
  });
});

function checkMetaInRuleTaskState(
  actual: RuleTaskState,
  original: RuleTaskState,
  wrappedUUIDs?: Map<string, string>
) {
  // delete the uuids from actual (a copy of it) to compare to original
  const copy = cloneDeep(actual);

  // make sure every alertInstance element has a UUID, and that's the only change
  for (const [id, alert] of Object.entries(actual.alertInstances || {})) {
    checkAlert(id, alert, original.alertInstances);
    delete copy?.alertInstances?.[id].meta?.uuid;
  }

  // make sure every alertRecoveredInstance element has a UUID, and that's the only change
  for (const [id, alert] of Object.entries(actual.alertRecoveredInstances || {})) {
    checkAlert(id, alert, original.alertRecoveredInstances);
    delete copy?.alertRecoveredInstances?.[id].meta?.uuid;
  }

  // after deleting the uuids, should be same as the original
  expect(copy).toStrictEqual(original);

  function checkAlert(id: string, alert: RawAlertInstance, instances?: RawAlertInstances) {
    expect(alert.meta?.uuid).toMatch(/^.{36}$/);

    const expectedAlert = instances?.[id];
    expect(omit(alert, 'meta.uuid')).toStrictEqual(expectedAlert);

    if (wrappedUUIDs) {
      expect(alert.meta?.uuid).toBe(wrappedUUIDs.get(id));
    }
  }
}

function checkMetaInRuleTaskStateWrapped(actual: RuleTaskState, expected: RuleTaskState) {
  const wrappedState = expected.alertTypeState as WrappedLifecycleRuleState<never>;

  const wrappedUUIDs = new Map<string, string>();
  for (const [id, alert] of Object.entries(wrappedState.trackedAlerts || {})) {
    wrappedUUIDs.set(id, alert.alertUuid);
  }

  for (const [id, alert] of Object.entries(wrappedState.trackedAlertsRecovered || {})) {
    wrappedUUIDs.set(id, alert.alertUuid);
  }

  checkMetaInRuleTaskState(actual, expected, wrappedUUIDs);
}

export function getMockData(
  overwrites: Record<string, unknown> = {}
): SavedObjectUnsanitizedDoc<SerializedConcreteTaskInstance> {
  return {
    id: 'some-uuid',
    type: 'task',
    attributes: {
      id: 'some-id',
      status: TaskStatus.Idle,
      taskType: 'some-taskType',
      state: JSON.stringify({}),
      params: JSON.stringify({ prop: true }),
      traceparent: 'some-traceparent',
      scheduledAt: new Date().toISOString(),
      startedAt: null,
      retryAt: null,
      runAt: new Date().toISOString(),
      attempts: 0,
      ownerId: null,
      ...cloneDeep(overwrites),
    },
  };
}

// data below generated by ../migrations_helpers/get-rule-task-state.js

const TaskDocIndexThreshold = {
  migrationVersion: { task: '8.5.0' },
  task: {
    retryAt: null,
    runAt: '2023-02-22T03:38:19.334Z',
    startedAt: null,
    params:
      '{"alertId":"4f11f730-b262-11ed-b5fa-5de11bbd3e96","spaceId":"default","consumer":"alerts"}',
    ownerId: null,
    enabled: true,
    schedule: { interval: '3s' },
    taskType: 'alerting:.index-threshold',
    scope: ['alerting'],
    traceparent: '',
    state:
      '{"alertTypeState":{},"alertInstances":{"host-C":{"state":{"start":"2023-02-22T03:38:10.433Z","duration":"6006000000"},"meta":{"flappingHistory":[true,false],"flapping":false,"pendingRecoveredCount":0,"lastScheduledActions":{"group":"threshold met","date":"2023-02-22T03:38:16.442Z"}}}},"alertRecoveredInstances":{"host-A":{"meta":{"flappingHistory":[true,false,true],"flapping":false}},"host-B":{"meta":{"flappingHistory":[true,false,true],"flapping":false}}},"summaryActions":{},"previousStartedAt":"2023-02-22T03:38:16.334Z"}',
    scheduledAt: '2023-02-22T03:38:13.331Z',
    attempts: 0,
    status: 'idle',
  },
  references: [],
  updated_at: '2023-02-22T03:38:16.570Z',
  coreMigrationVersion: '8.7.0',
  created_at: '2023-02-22T03:38:03.160Z',
  type: 'task',
};

// included just so the `state` JSON data ^^^ is readable
const RuleStateIndexThreshold: RuleTaskState = {
  alertTypeState: {},
  alertInstances: {
    'host-C': {
      state: {
        start: '2023-02-22T03:38:10.433Z',
        duration: '6006000000',
      },
      meta: {
        flappingHistory: [true, false],
        flapping: false,
        pendingRecoveredCount: 0,
        lastScheduledActions: {
          group: 'threshold met',
          date: '2023-02-22T03:38:16.442Z',
        },
      },
    },
  },
  alertRecoveredInstances: {
    'host-A': {
      meta: {
        flappingHistory: [true, false, true],
        flapping: false,
      },
    },
    'host-B': {
      meta: {
        flappingHistory: [true, false, true],
        flapping: false,
      },
    },
  },
  summaryActions: {},
  previousStartedAt: '2023-02-22T03:38:16.334Z',

  // This cast is needed as RuleTaskState defines dates as Date, but
  // they are stored as strings.  There is no "serialized" version
  // of this, it's an io-ts generated type.  You can check the rest
  // of the types by deleting the "as unknown as ..." bits below.
} as unknown as RuleTaskState;

const TaskDocMetricThreshold = {
  migrationVersion: { task: '8.5.0' },
  task: {
    retryAt: null,
    runAt: '2023-02-22T03:38:16.328Z',
    startedAt: null,
    params:
      '{"alertId":"4dd72d40-b262-11ed-b5fa-5de11bbd3e96","spaceId":"default","consumer":"infrastructure"}',
    ownerId: null,
    enabled: true,
    schedule: { interval: '3s' },
    taskType: 'alerting:metrics.alert.threshold',
    scope: ['alerting'],
    traceparent: '',
    state:
      '{"alertTypeState":{"wrapped":{"lastRunTimestamp":1677037093328,"missingGroups":[],"groupBy":["network.name"]},"trackedAlerts":{"host-A":{"alertId":"host-A","alertUuid":"f8b420a4-a596-4c96-8e42-6da5a167dd56","started":"2023-02-22T03:38:13.328Z","flappingHistory":[true,true,true],"flapping":false,"pendingRecoveredCount":0},"host-B":{"alertId":"host-B","alertUuid":"1ecbe90f-a196-40db-aede-094577ccbf14","started":"2023-02-22T03:38:13.328Z","flappingHistory":[true,true,true],"flapping":false,"pendingRecoveredCount":0}},"trackedAlertsRecovered":{"host-C":{"alertId":"host-C","alertUuid":"95669714-2ab6-4155-8928-107aea504f39","started":"2023-02-22T03:38:07.330Z","flappingHistory":[true,true],"flapping":false,"pendingRecoveredCount":0}}},"alertInstances":{"host-A":{"state":{"start":"2023-02-22T03:38:13.587Z","duration":"0"},"meta":{"flappingHistory":[true,true,true],"flapping":false,"pendingRecoveredCount":0,"lastScheduledActions":{"group":"metrics.threshold.fired","date":"2023-02-22T03:38:13.590Z"}}},"host-B":{"state":{"start":"2023-02-22T03:38:13.587Z","duration":"0"},"meta":{"flappingHistory":[true,true,true],"flapping":false,"pendingRecoveredCount":0,"lastScheduledActions":{"group":"metrics.threshold.fired","date":"2023-02-22T03:38:13.591Z"}}}},"alertRecoveredInstances":{"host-C":{"meta":{"flappingHistory":[true,true],"flapping":false}}},"summaryActions":{},"previousStartedAt":"2023-02-22T03:38:13.328Z"}',
    scheduledAt: '2023-02-22T03:38:10.330Z',
    attempts: 0,
    status: 'idle',
  },
  references: [],
  updated_at: '2023-02-22T03:38:13.699Z',
  coreMigrationVersion: '8.7.0',
  created_at: '2023-02-22T03:38:01.102Z',
  type: 'task',
};

// included just so the `state` JSON data ^^^ is readable
const RuleStateMetricThreshold: RuleTaskState = {
  alertTypeState: {
    wrapped: {
      lastRunTimestamp: 1677037093328,
      missingGroups: [],
      groupBy: ['network.name'],
    },
    trackedAlerts: {
      'host-A': {
        alertId: 'host-A',
        alertUuid: 'f8b420a4-a596-4c96-8e42-6da5a167dd56',
        started: '2023-02-22T03:38:13.328Z',
        flappingHistory: [true, true, true],
        flapping: false,
        pendingRecoveredCount: 0,
      },
      'host-B': {
        alertId: 'host-B',
        alertUuid: '1ecbe90f-a196-40db-aede-094577ccbf14',
        started: '2023-02-22T03:38:13.328Z',
        flappingHistory: [true, true, true],
        flapping: false,
        pendingRecoveredCount: 0,
      },
    },
    trackedAlertsRecovered: {
      'host-C': {
        alertId: 'host-C',
        alertUuid: '95669714-2ab6-4155-8928-107aea504f39',
        started: '2023-02-22T03:38:07.330Z',
        flappingHistory: [true, true],
        flapping: false,
        pendingRecoveredCount: 0,
      },
    },
  },
  alertInstances: {
    'host-A': {
      state: {
        start: '2023-02-22T03:38:13.587Z',
        duration: '0',
      },
      meta: {
        flappingHistory: [true, true, true],
        flapping: false,
        pendingRecoveredCount: 0,
        lastScheduledActions: {
          group: 'metrics.threshold.fired',
          date: '2023-02-22T03:38:13.590Z',
        },
      },
    },
    'host-B': {
      state: {
        start: '2023-02-22T03:38:13.587Z',
        duration: '0',
      },
      meta: {
        flappingHistory: [true, true, true],
        flapping: false,
        pendingRecoveredCount: 0,
        lastScheduledActions: {
          group: 'metrics.threshold.fired',
          date: '2023-02-22T03:38:13.591Z',
        },
      },
    },
  },
  alertRecoveredInstances: {
    'host-C': {
      meta: {
        flappingHistory: [true, true],
        flapping: false,
      },
    },
  },
  summaryActions: {},
  previousStartedAt: '2023-02-22T03:38:13.328Z',
  // see ^^^ for the index threshold rule why this cast is needed
} as unknown as RuleTaskState;
