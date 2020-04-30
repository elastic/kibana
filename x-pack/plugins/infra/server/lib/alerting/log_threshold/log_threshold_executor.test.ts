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
import { AlertExecutorOptions } from '../../../../../alerting/server';
import {
  alertsMock,
  AlertInstanceMock,
  AlertServicesMock,
} from '../../../../../alerting/server/mocks';
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

// services.callCluster.mockImplementation(async (_: string, { body, index }: any) => {
//   // To make testing easier we will specify the alert count in the metric
//   // `{ field: 'count.is.12' }` => Mocks `{ count: 3}`
//   // `{ field: 'count.is.something' }` => Mocks `{ count: 0 }`
//   const metric = Object.keys(body.query.bool.must[0]?.range)[0];
//   const count = metric ? parseInt(metric.split('.').pop()!, 10) || 0 : 0;

//   return { count };
// });

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
