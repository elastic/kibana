/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from 'src/core/public/mocks';
import { CoreSetup } from '../../../../../src/core/server';
import { monitoringCollectionMock } from '../../../monitoring_collection/server/mocks';
import { Metric } from '../../../monitoring_collection/server';
import { registerClusterCollector } from './register_cluster_collector';
import { ActionsPluginsStart } from '../plugin';
import { ClusterActionsMetric } from './types';

jest.useFakeTimers('modern');
jest.setSystemTime(new Date('2020-03-09').getTime());

describe('registerClusterCollector()', () => {
  const monitoringCollection = monitoringCollectionMock.createSetup();
  const coreSetup = coreMock.createSetup() as unknown as CoreSetup<ActionsPluginsStart, unknown>;
  const taskManagerFetch = jest.fn();

  beforeEach(() => {
    (coreSetup.getStartServices as jest.Mock).mockImplementation(async () => {
      return [
        undefined,
        {
          taskManager: {
            fetch: taskManagerFetch,
          },
        },
      ];
    });
  });

  it('should get overdue actions', async () => {
    const metrics: Record<string, Metric<unknown>> = {};
    monitoringCollection.registerMetric.mockImplementation((metric) => {
      metrics[metric.type] = metric;
    });
    registerClusterCollector({ monitoringCollection, core: coreSetup });

    const metricTypes = Object.keys(metrics);
    expect(metricTypes.length).toBe(1);
    expect(metricTypes[0]).toBe('cluster_actions');

    const nowInMs = +new Date();
    const docs = [
      {
        runAt: nowInMs - 1000,
      },
      {
        retryAt: nowInMs - 1000,
      },
    ];
    taskManagerFetch.mockImplementation(async () => ({ docs }));

    const result = (await metrics.cluster_actions.fetch()) as ClusterActionsMetric;
    expect(result.overdue.count).toBe(docs.length);
    expect(result.overdue.delay.p50).toBe(1000);
    expect(result.overdue.delay.p99).toBe(1000);
    expect(taskManagerFetch).toHaveBeenCalledWith({
      query: {
        bool: {
          must: [
            {
              term: {
                'task.scope': {
                  value: 'actions',
                },
              },
            },
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [
                        {
                          term: {
                            'task.status': 'idle',
                          },
                        },
                        {
                          range: {
                            'task.runAt': {
                              lte: 'now',
                            },
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      must: [
                        {
                          bool: {
                            should: [
                              {
                                term: {
                                  'task.status': 'running',
                                },
                              },
                              {
                                term: {
                                  'task.status': 'claiming',
                                },
                              },
                            ],
                          },
                        },
                        {
                          range: {
                            'task.retryAt': {
                              lte: 'now',
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
  });

  it('should calculate accurate p50 and p99', async () => {
    const metrics: Record<string, Metric<unknown>> = {};
    monitoringCollection.registerMetric.mockImplementation((metric) => {
      metrics[metric.type] = metric;
    });
    registerClusterCollector({ monitoringCollection, core: coreSetup });

    const metricTypes = Object.keys(metrics);
    expect(metricTypes.length).toBe(1);
    expect(metricTypes[0]).toBe('cluster_actions');

    const nowInMs = +new Date();
    const docs = [
      { runAt: nowInMs - 1000 },
      { runAt: nowInMs - 2000 },
      { runAt: nowInMs - 3000 },
      { runAt: nowInMs - 4000 },
      { runAt: nowInMs - 40000 },
    ];
    taskManagerFetch.mockImplementation(async () => ({ docs }));

    const result = (await metrics.cluster_actions.fetch()) as ClusterActionsMetric;
    expect(result.overdue.count).toBe(docs.length);
    expect(result.overdue.delay.p50).toBe(3000);
    expect(result.overdue.delay.p99).toBe(40000);
  });
});
