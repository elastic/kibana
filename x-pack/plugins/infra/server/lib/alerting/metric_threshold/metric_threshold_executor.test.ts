/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createMetricThresholdExecutor, FIRED_ACTIONS } from './metric_threshold_executor';
import { Comparator, AlertStates } from './types';
import * as mocks from './test_mocks';
import { AlertExecutorOptions } from '../../../../../alerting/server';
import {
  alertsMock,
  AlertServicesMock,
  AlertInstanceMock,
} from '../../../../../alerting/server/mocks';
import { InfraSources } from '../../sources';

interface AlertTestInstance {
  instance: AlertInstanceMock;
  actionQueue: any[];
  state: any;
}

describe('The metric threshold alert type', () => {
  describe('querying the entire infrastructure', () => {
    const instanceID = 'test-*';
    const execute = (comparator: Comparator, threshold: number[], sourceId: string = 'default') =>
      executor({
        services,
        params: {
          sourceId,
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
      expect(mostRecentAction(instanceID).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceID).alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.GT, [1.5]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
      expect(getState(instanceID).alertState).toBe(AlertStates.OK);
    });
    test('alerts as expected with the < comparator', async () => {
      await execute(Comparator.LT, [1.5]);
      expect(mostRecentAction(instanceID).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceID).alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.LT, [0.75]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
      expect(getState(instanceID).alertState).toBe(AlertStates.OK);
    });
    test('alerts as expected with the >= comparator', async () => {
      await execute(Comparator.GT_OR_EQ, [0.75]);
      expect(mostRecentAction(instanceID).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceID).alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.GT_OR_EQ, [1.0]);
      expect(mostRecentAction(instanceID).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceID).alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.GT_OR_EQ, [1.5]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
      expect(getState(instanceID).alertState).toBe(AlertStates.OK);
    });
    test('alerts as expected with the <= comparator', async () => {
      await execute(Comparator.LT_OR_EQ, [1.5]);
      expect(mostRecentAction(instanceID).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceID).alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.LT_OR_EQ, [1.0]);
      expect(mostRecentAction(instanceID).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceID).alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.LT_OR_EQ, [0.75]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
      expect(getState(instanceID).alertState).toBe(AlertStates.OK);
    });
    test('alerts as expected with the between comparator', async () => {
      await execute(Comparator.BETWEEN, [0, 1.5]);
      expect(mostRecentAction(instanceID).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceID).alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.BETWEEN, [0, 0.75]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
      expect(getState(instanceID).alertState).toBe(AlertStates.OK);
    });
    test('alerts as expected with the outside range comparator', async () => {
      await execute(Comparator.OUTSIDE_RANGE, [0, 0.75]);
      expect(mostRecentAction(instanceID).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceID).alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.OUTSIDE_RANGE, [0, 1.5]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
      expect(getState(instanceID).alertState).toBe(AlertStates.OK);
    });
    test('reports expected values to the action context', async () => {
      await execute(Comparator.GT, [0.75]);
      const { action } = mostRecentAction(instanceID);
      expect(action.group).toBe('*');
      expect(action.reason).toContain('current value is 1');
      expect(action.reason).toContain('threshold of 0.75');
      expect(action.reason).toContain('test.metric.1');
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
      expect(mostRecentAction(instanceIdA).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceIdA).alertState).toBe(AlertStates.ALERT);
      expect(mostRecentAction(instanceIdB).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceIdB).alertState).toBe(AlertStates.ALERT);
    });
    test('sends an alert when only some groups pass the threshold', async () => {
      await execute(Comparator.LT, [1.5]);
      expect(mostRecentAction(instanceIdA).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceIdA).alertState).toBe(AlertStates.ALERT);
      expect(mostRecentAction(instanceIdB)).toBe(undefined);
      expect(getState(instanceIdB).alertState).toBe(AlertStates.OK);
    });
    test('sends no alert when no groups pass the threshold', async () => {
      await execute(Comparator.GT, [5]);
      expect(mostRecentAction(instanceIdA)).toBe(undefined);
      expect(getState(instanceIdA).alertState).toBe(AlertStates.OK);
      expect(mostRecentAction(instanceIdB)).toBe(undefined);
      expect(getState(instanceIdB).alertState).toBe(AlertStates.OK);
    });
    test('reports group values to the action context', async () => {
      await execute(Comparator.GT, [0.75]);
      expect(mostRecentAction(instanceIdA).action.group).toBe('a');
      expect(mostRecentAction(instanceIdB).action.group).toBe('b');
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
      expect(mostRecentAction(instanceID).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceID).alertState).toBe(AlertStates.ALERT);
    });
    test('sends no alert when some, but not all, criteria cross the threshold', async () => {
      const instanceID = 'test-*';
      await execute(Comparator.LT_OR_EQ, [1.0], [3.0]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
      expect(getState(instanceID).alertState).toBe(AlertStates.OK);
    });
    test('alerts only on groups that meet all criteria when querying with a groupBy parameter', async () => {
      const instanceIdA = 'test-a';
      const instanceIdB = 'test-b';
      await execute(Comparator.GT_OR_EQ, [1.0], [3.0], 'something');
      expect(mostRecentAction(instanceIdA).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceIdA).alertState).toBe(AlertStates.ALERT);
      expect(mostRecentAction(instanceIdB)).toBe(undefined);
      expect(getState(instanceIdB).alertState).toBe(AlertStates.OK);
    });
    test('sends all criteria to the action context', async () => {
      const instanceID = 'test-*';
      await execute(Comparator.GT_OR_EQ, [1.0], [3.0]);
      const { action } = mostRecentAction(instanceID);
      const reasons = action.reason.split('\n');
      expect(reasons.length).toBe(2);
      expect(reasons[0]).toContain('test.metric.1');
      expect(reasons[1]).toContain('test.metric.2');
      expect(reasons[0]).toContain('current value is 1');
      expect(reasons[1]).toContain('current value is 3.5');
      expect(reasons[0]).toContain('threshold of 1');
      expect(reasons[1]).toContain('threshold of 3');
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
              metric: undefined,
            },
          ],
        },
      });
    test('alerts based on the doc_count value instead of the aggregatedValue', async () => {
      await execute(Comparator.GT, [2]);
      expect(mostRecentAction(instanceID).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceID).alertState).toBe(AlertStates.ALERT);
      await execute(Comparator.LT, [1.5]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
      expect(getState(instanceID).alertState).toBe(AlertStates.OK);
    });
  });
  describe("querying a metric that hasn't reported data", () => {
    const instanceID = 'test-*';
    const execute = (alertOnNoData: boolean) =>
      executor({
        services,
        params: {
          criteria: [
            {
              ...baseCriterion,
              comparator: Comparator.GT,
              threshold: 1,
              metric: 'test.metric.3',
            },
          ],
          alertOnNoData,
        },
      });
    test('sends a No Data alert when configured to do so', async () => {
      await execute(true);
      expect(mostRecentAction(instanceID).id).toBe(FIRED_ACTIONS.id);
      expect(getState(instanceID).alertState).toBe(AlertStates.NO_DATA);
    });
    test('does not send a No Data alert when not configured to do so', async () => {
      await execute(false);
      expect(mostRecentAction(instanceID)).toBe(undefined);
      expect(getState(instanceID).alertState).toBe(AlertStates.NO_DATA);
    });
  });
});

const createMockStaticConfiguration = (sources: any) => ({
  enabled: true,
  query: {
    partitionSize: 1,
    partitionFactor: 1,
  },
  sources,
});

const mockLibs: any = {
  sources: new InfraSources({
    config: createMockStaticConfiguration({}),
  }),
  configuration: createMockStaticConfiguration({}),
};

const executor = createMetricThresholdExecutor(mockLibs, 'test') as (opts: {
  params: AlertExecutorOptions['params'];
  services: { callCluster: AlertExecutorOptions['params']['callCluster'] };
}) => Promise<void>;

const services: AlertServicesMock = alertsMock.createAlertServices();
services.callCluster.mockImplementation(async (_: string, { body, index }: any) => {
  if (index === 'alternatebeat-*') return mocks.changedSourceIdResponse;
  const metric = body.query.bool.filter[1]?.exists.field;
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
});
services.savedObjectsClient.get.mockImplementation(async (type: string, sourceId: string) => {
  if (sourceId === 'alternate')
    return {
      id: 'alternate',
      attributes: { metricAlias: 'alternatebeat-*' },
      type,
      references: [],
    };
  return { id: 'default', attributes: { metricAlias: 'metricbeat-*' }, type, references: [] };
});

services.callCluster.mockImplementation(async (_: string, { body, index }: any) => {
  if (index === 'alternatebeat-*') return mocks.changedSourceIdResponse;
  const metric = body.query.bool.filter[1]?.exists.field;
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
  } else if (metric === 'test.metric.3') {
    return mocks.emptyMetricResponse;
  }
  return mocks.basicMetricResponse;
});
services.savedObjectsClient.get.mockImplementation(async (type: string, sourceId: string) => {
  if (sourceId === 'alternate')
    return {
      id: 'alternate',
      attributes: { metricAlias: 'alternatebeat-*' },
      type,
      references: [],
    };
  return { id: 'default', attributes: { metricAlias: 'metricbeat-*' }, type, references: [] };
});

const alertInstances = new Map<string, AlertTestInstance>();
services.alertInstanceFactory.mockImplementation((instanceID: string) => {
  const alertInstance: AlertTestInstance = {
    instance: alertsMock.createAlertInstanceFactory(),
    actionQueue: [],
    state: {},
  };
  alertInstances.set(instanceID, alertInstance);
  alertInstance.instance.replaceState.mockImplementation((newState: any) => {
    alertInstance.state = newState;
    return alertInstance.instance;
  });
  alertInstance.instance.scheduleActions.mockImplementation((id: string, action: any) => {
    alertInstance.actionQueue.push({ id, action });
    return alertInstance.instance;
  });
  return alertInstance.instance;
});

function mostRecentAction(id: string) {
  return alertInstances.get(id)!.actionQueue.pop();
}

function getState(id: string) {
  return alertInstances.get(id)!.state;
}

const baseCriterion = {
  aggType: 'avg',
  metric: 'test.metric.1',
  timeSize: 1,
  timeUnit: 'm',
};
