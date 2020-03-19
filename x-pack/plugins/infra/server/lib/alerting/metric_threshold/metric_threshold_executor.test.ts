/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMetricThresholdExecutor, FIRED_ACTIONS } from './metric_threshold_executor';
import { Comparator, AlertStates } from './types';
import * as mocks from './test_mocks';
import { AlertExecutorOptions } from '../../../../../alerting/server';

const executor = createMetricThresholdExecutor('test') as (opts: {
  params: AlertExecutorOptions['params'];
  services: { callCluster: AlertExecutorOptions['params']['callCluster'] };
}) => Promise<void>;
const alertInstances = new Map();

const services = {
  callCluster(_: string, { body }: any) {
    const metric = body.query.bool.filter[1].exists.field;
    if (body.aggs.groupings) {
      if (body.aggs.groupings.composite.after) {
        return mocks.compositeEndResponse;
      }
      if (metric === 'test.metric.2') {
        return mocks.alternateCompositeResponse;
      }
      return mocks.basicCompositeResponse;
    }
    if (metric === 'test.metric.2') {
      return mocks.alternateMetricResponse;
    }
    return mocks.basicMetricResponse;
  },
  alertInstanceFactory(instanceID: string) {
    let state: any;
    const actionQueue: any[] = [];
    const instance = {
      actionQueue: [],
      get state() {
        return state;
      },
      get mostRecentAction() {
        return actionQueue.pop();
      },
    };
    alertInstances.set(instanceID, instance);
    return {
      instanceID,
      scheduleActions(id: string, action: any) {
        actionQueue.push({ id, action });
      },
      replaceState(newState: any) {
        state = newState;
      },
    };
  },
};

const baseCriterion = {
  aggType: 'avg',
  metric: 'test.metric.1',
  timeSize: 1,
  timeUnit: 'm',
  indexPattern: 'metricbeat-*',
};
describe('The metric threshold alert type', () => {
  describe('querying the entire infrastructure', () => {
    const instanceID = 'test-*';
    const execute = (comparator: Comparator, threshold: number[]) =>
      executor({
        services,
        params: {
          criteria: [
            {
              ...baseCriterion,
              comparator,
              threshold,
            },
          ],
        },
      });
    test('alerts as expected with the > comparator', async () => {
      await execute(Comparator.GT, [0.75]);
      expect(alertInstances.get(instanceID).mostRecentAction.id).toBe(FIRED_ACTIONS.id);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.GT, [1.5]);
      expect(alertInstances.get(instanceID).mostRecentAction).toBe(undefined);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.OK);
    });
    test('alerts as expected with the < comparator', async () => {
      await execute(Comparator.LT, [1.5]);
      expect(alertInstances.get(instanceID).mostRecentAction.id).toBe(FIRED_ACTIONS.id);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.LT, [0.75]);
      expect(alertInstances.get(instanceID).mostRecentAction).toBe(undefined);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.OK);
    });
    test('alerts as expected with the >= comparator', async () => {
      await execute(Comparator.GT_OR_EQ, [0.75]);
      expect(alertInstances.get(instanceID).mostRecentAction.id).toBe(FIRED_ACTIONS.id);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.GT_OR_EQ, [1.0]);
      expect(alertInstances.get(instanceID).mostRecentAction.id).toBe(FIRED_ACTIONS.id);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.GT_OR_EQ, [1.5]);
      expect(alertInstances.get(instanceID).mostRecentAction).toBe(undefined);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.OK);
    });
    test('alerts as expected with the <= comparator', async () => {
      await execute(Comparator.LT_OR_EQ, [1.5]);
      expect(alertInstances.get(instanceID).mostRecentAction.id).toBe(FIRED_ACTIONS.id);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.LT_OR_EQ, [1.0]);
      expect(alertInstances.get(instanceID).mostRecentAction.id).toBe(FIRED_ACTIONS.id);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.LT_OR_EQ, [0.75]);
      expect(alertInstances.get(instanceID).mostRecentAction).toBe(undefined);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.OK);
    });
    test('alerts as expected with the between comparator', async () => {
      await execute(Comparator.BETWEEN, [0, 1.5]);
      expect(alertInstances.get(instanceID).mostRecentAction.id).toBe(FIRED_ACTIONS.id);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.BETWEEN, [0, 0.75]);
      expect(alertInstances.get(instanceID).mostRecentAction).toBe(undefined);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.OK);
    });
  });

  describe('querying with a groupBy parameter', () => {
    const execute = (comparator: Comparator, threshold: number[]) =>
      executor({
        services,
        params: {
          groupBy: 'something',
          criteria: [
            {
              ...baseCriterion,
              comparator,
              threshold,
            },
          ],
        },
      });
    const instanceIdA = 'test-a';
    const instanceIdB = 'test-b';
    test('sends an alert when all groups pass the threshold', async () => {
      await execute(Comparator.GT, [0.75]);
      expect(alertInstances.get(instanceIdA).mostRecentAction.id).toBe(FIRED_ACTIONS.id);
      expect(alertInstances.get(instanceIdA).state.alertState).toBe(AlertStates.ALERT);
      expect(alertInstances.get(instanceIdB).mostRecentAction.id).toBe(FIRED_ACTIONS.id);
      expect(alertInstances.get(instanceIdB).state.alertState).toBe(AlertStates.ALERT);
    });
    test('sends an alert when only some groups pass the threshold', async () => {
      await execute(Comparator.LT, [1.5]);
      expect(alertInstances.get(instanceIdA).mostRecentAction.id).toBe(FIRED_ACTIONS.id);
      expect(alertInstances.get(instanceIdA).state.alertState).toBe(AlertStates.ALERT);
      expect(alertInstances.get(instanceIdB).mostRecentAction).toBe(undefined);
      expect(alertInstances.get(instanceIdB).state.alertState).toBe(AlertStates.OK);
    });
    test('sends no alert when no groups pass the threshold', async () => {
      await execute(Comparator.GT, [5]);
      expect(alertInstances.get(instanceIdA).mostRecentAction).toBe(undefined);
      expect(alertInstances.get(instanceIdA).state.alertState).toBe(AlertStates.OK);
      expect(alertInstances.get(instanceIdB).mostRecentAction).toBe(undefined);
      expect(alertInstances.get(instanceIdB).state.alertState).toBe(AlertStates.OK);
    });
  });

  describe('querying with multiple criteria', () => {
    const execute = (
      comparator: Comparator,
      thresholdA: number[],
      thresholdB: number[],
      groupBy: string = ''
    ) =>
      executor({
        services,
        params: {
          groupBy,
          criteria: [
            {
              ...baseCriterion,
              comparator,
              threshold: thresholdA,
            },
            {
              ...baseCriterion,
              comparator,
              threshold: thresholdB,
              metric: 'test.metric.2',
            },
          ],
        },
      });
    test('sends an alert when all criteria cross the threshold', async () => {
      const instanceID = 'test-*';
      await execute(Comparator.GT_OR_EQ, [1.0], [3.0]);
      expect(alertInstances.get(instanceID).mostRecentAction.id).toBe(FIRED_ACTIONS.id);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.ALERT);
    });
    test('sends no alert when some, but not all, criteria cross the threshold', async () => {
      const instanceID = 'test-*';
      await execute(Comparator.LT_OR_EQ, [1.0], [3.0]);
      expect(alertInstances.get(instanceID).mostRecentAction).toBe(undefined);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.OK);
    });
    test('alerts only on groups that meet all criteria when querying with a groupBy parameter', async () => {
      const instanceIdA = 'test-a';
      const instanceIdB = 'test-b';
      await execute(Comparator.GT_OR_EQ, [1.0], [3.0], 'something');
      expect(alertInstances.get(instanceIdA).mostRecentAction.id).toBe(FIRED_ACTIONS.id);
      expect(alertInstances.get(instanceIdA).state.alertState).toBe(AlertStates.ALERT);
      expect(alertInstances.get(instanceIdB).mostRecentAction).toBe(undefined);
      expect(alertInstances.get(instanceIdB).state.alertState).toBe(AlertStates.OK);
    });
  });
  describe('querying with the count aggregator', () => {
    const instanceID = 'test-*';
    const execute = (comparator: Comparator, threshold: number[]) =>
      executor({
        services,
        params: {
          criteria: [
            {
              ...baseCriterion,
              comparator,
              threshold,
              aggType: 'count',
            },
          ],
        },
      });
    test('alerts based on the doc_count value instead of the aggregatedValue', async () => {
      await execute(Comparator.GT, [2]);
      expect(alertInstances.get(instanceID).mostRecentAction.id).toBe(FIRED_ACTIONS.id);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.LT, [1.5]);
      expect(alertInstances.get(instanceID).mostRecentAction).toBe(undefined);
      expect(alertInstances.get(instanceID).state.alertState).toBe(AlertStates.OK);
    });
  });
});
