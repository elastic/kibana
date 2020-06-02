/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createLogThresholdExecutor } from './log_threshold_executor';
import {
  Comparator,
  AlertStates,
  LogDocumentCountAlertParams,
  Criterion,
} from '../../../../common/alerting/logs/types';
import { AlertExecutorOptions } from '../../../../../alerts/server';
import {
  alertsMock,
  AlertInstanceMock,
  AlertServicesMock,
} from '../../../../../alerts/server/mocks';
import { libsMock } from './mocks';

interface AlertTestInstance {
  instance: AlertInstanceMock;
  actionQueue: any[];
  state: any;
}

/*
 * Mocks
 */
const alertInstances = new Map();

const services: AlertServicesMock = alertsMock.createAlertServices();
services.alertInstanceFactory.mockImplementation((instanceId: string) => {
  const alertInstance: AlertTestInstance = {
    instance: alertsMock.createAlertInstanceFactory(),
    actionQueue: [],
    state: {},
  };
  alertInstance.instance.replaceState.mockImplementation((newState: any) => {
    alertInstance.state = newState;
    return alertInstance.instance;
  });
  alertInstance.instance.scheduleActions.mockImplementation((id: string, action: any) => {
    alertInstance.actionQueue.push({ id, action });
    return alertInstance.instance;
  });

  alertInstances.set(instanceId, alertInstance);

  return alertInstance.instance;
});

/*
 * Helper functions
 */
function getAlertState(instanceId: string): AlertStates {
  const alert = alertInstances.get(instanceId);
  if (alert) {
    return alert.state.alertState;
  } else {
    throw new Error('Could not find alert instance `' + instanceId + '`');
  }
}

/*
 * Executor instance (our test subject)
 */
const executor = (createLogThresholdExecutor('test', libsMock) as unknown) as (opts: {
  params: LogDocumentCountAlertParams;
  services: { callCluster: AlertExecutorOptions['params']['callCluster'] };
}) => Promise<void>;

// Wrapper to test
type Comparison = [number, Comparator, number];
async function callExecutor(
  [value, comparator, threshold]: Comparison,
  criteria: Criterion[] = []
) {
  services.callCluster.mockImplementationOnce(async (..._) => ({ count: value }));

  return await executor({
    services,
    params: {
      count: { value: threshold, comparator },
      timeSize: 1,
      timeUnit: 'm',
      criteria,
    },
  });
}

describe('Comparators trigger alerts correctly', () => {
  it('does not alert when counts do not reach the threshold', async () => {
    await callExecutor([0, Comparator.GT, 1]);
    expect(getAlertState('test')).toBe(AlertStates.OK);

    await callExecutor([0, Comparator.GT_OR_EQ, 1]);
    expect(getAlertState('test')).toBe(AlertStates.OK);

    await callExecutor([1, Comparator.LT, 0]);
    expect(getAlertState('test')).toBe(AlertStates.OK);

    await callExecutor([1, Comparator.LT_OR_EQ, 0]);
    expect(getAlertState('test')).toBe(AlertStates.OK);
  });

  it('alerts when counts reach the threshold', async () => {
    await callExecutor([2, Comparator.GT, 1]);
    expect(getAlertState('test')).toBe(AlertStates.ALERT);

    await callExecutor([1, Comparator.GT_OR_EQ, 1]);
    expect(getAlertState('test')).toBe(AlertStates.ALERT);

    await callExecutor([1, Comparator.LT, 2]);
    expect(getAlertState('test')).toBe(AlertStates.ALERT);

    await callExecutor([2, Comparator.LT_OR_EQ, 2]);
    expect(getAlertState('test')).toBe(AlertStates.ALERT);
  });
});

describe('Comparators create the correct ES queries', () => {
  beforeEach(() => {
    services.callCluster.mockReset();
  });

  it('Works with `Comparator.EQ`', async () => {
    await callExecutor(
      [2, Comparator.GT, 1], // Not relevant
      [{ field: 'foo', comparator: Comparator.EQ, value: 'bar' }]
    );

    const query = services.callCluster.mock.calls[0][1]!;
    expect(query.body).toMatchObject({
      query: {
        bool: {
          must: [{ term: { foo: { value: 'bar' } } }],
        },
      },
    });
  });

  it('works with `Comparator.NOT_EQ`', async () => {
    await callExecutor(
      [2, Comparator.GT, 1], // Not relevant
      [{ field: 'foo', comparator: Comparator.NOT_EQ, value: 'bar' }]
    );

    const query = services.callCluster.mock.calls[0][1]!;
    expect(query.body).toMatchObject({
      query: {
        bool: {
          must_not: [{ term: { foo: { value: 'bar' } } }],
        },
      },
    });
  });

  it('works with `Comparator.MATCH`', async () => {
    await callExecutor(
      [2, Comparator.GT, 1], // Not relevant
      [{ field: 'foo', comparator: Comparator.MATCH, value: 'bar' }]
    );

    const query = services.callCluster.mock.calls[0][1]!;
    expect(query.body).toMatchObject({
      query: {
        bool: {
          must: [{ match: { foo: 'bar' } }],
        },
      },
    });
  });

  it('works with `Comparator.NOT_MATCH`', async () => {
    await callExecutor(
      [2, Comparator.GT, 1], // Not relevant
      [{ field: 'foo', comparator: Comparator.NOT_MATCH, value: 'bar' }]
    );

    const query = services.callCluster.mock.calls[0][1]!;
    expect(query.body).toMatchObject({
      query: {
        bool: {
          must_not: [{ match: { foo: 'bar' } }],
        },
      },
    });
  });

  it('works with `Comparator.MATCH_PHRASE`', async () => {
    await callExecutor(
      [2, Comparator.GT, 1], // Not relevant
      [{ field: 'foo', comparator: Comparator.MATCH_PHRASE, value: 'bar' }]
    );

    const query = services.callCluster.mock.calls[0][1]!;
    expect(query.body).toMatchObject({
      query: {
        bool: {
          must: [{ match_phrase: { foo: 'bar' } }],
        },
      },
    });
  });

  it('works with `Comparator.NOT_MATCH_PHRASE`', async () => {
    await callExecutor(
      [2, Comparator.GT, 1], // Not relevant
      [{ field: 'foo', comparator: Comparator.NOT_MATCH_PHRASE, value: 'bar' }]
    );

    const query = services.callCluster.mock.calls[0][1]!;
    expect(query.body).toMatchObject({
      query: {
        bool: {
          must_not: [{ match_phrase: { foo: 'bar' } }],
        },
      },
    });
  });

  it('works with `Comparator.GT`', async () => {
    await callExecutor(
      [2, Comparator.GT, 1], // Not relevant
      [{ field: 'foo', comparator: Comparator.GT, value: 1 }]
    );

    const query = services.callCluster.mock.calls[0][1]!;
    expect(query.body).toMatchObject({
      query: {
        bool: {
          must: [{ range: { foo: { gt: 1 } } }],
        },
      },
    });
  });

  it('works with `Comparator.GT_OR_EQ`', async () => {
    await callExecutor(
      [2, Comparator.GT, 1], // Not relevant
      [{ field: 'foo', comparator: Comparator.GT_OR_EQ, value: 1 }]
    );

    const query = services.callCluster.mock.calls[0][1]!;
    expect(query.body).toMatchObject({
      query: {
        bool: {
          must: [{ range: { foo: { gte: 1 } } }],
        },
      },
    });
  });

  it('works with `Comparator.LT`', async () => {
    await callExecutor(
      [2, Comparator.GT, 1], // Not relevant
      [{ field: 'foo', comparator: Comparator.LT, value: 1 }]
    );

    const query = services.callCluster.mock.calls[0][1]!;
    expect(query.body).toMatchObject({
      query: {
        bool: {
          must: [{ range: { foo: { lt: 1 } } }],
        },
      },
    });
  });

  it('works with `Comparator.LT_OR_EQ`', async () => {
    await callExecutor(
      [2, Comparator.GT, 1], // Not relevant
      [{ field: 'foo', comparator: Comparator.LT_OR_EQ, value: 1 }]
    );

    const query = services.callCluster.mock.calls[0][1]!;
    expect(query.body).toMatchObject({
      query: {
        bool: {
          must: [{ range: { foo: { lte: 1 } } }],
        },
      },
    });
  });
});

describe('Multiple criteria create the right ES query', () => {
  beforeEach(() => {
    services.callCluster.mockReset();
  });
  it('works', async () => {
    await callExecutor(
      [2, Comparator.GT, 1], // Not relevant
      [
        { field: 'foo', comparator: Comparator.EQ, value: 'bar' },
        { field: 'http.status', comparator: Comparator.LT, value: 400 },
      ]
    );

    const query = services.callCluster.mock.calls[0][1]!;
    expect(query.body).toMatchObject({
      query: {
        bool: {
          must: [{ term: { foo: { value: 'bar' } } }, { range: { 'http.status': { lt: 400 } } }],
        },
      },
    });
  });
});
