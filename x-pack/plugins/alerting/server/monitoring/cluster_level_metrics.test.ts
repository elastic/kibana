/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/public/mocks';
import { CoreSetup } from '@kbn/core/server';
import { monitoringCollectionMock } from '@kbn/monitoring-collection-plugin/server/mocks';
import { MetricSet, ValidMetricResult } from '@kbn/monitoring-collection-plugin/server';
import { registerClusterLevelMetrics } from './cluster_level_metrics';
import { AlertingPluginsStart } from '../plugin';

jest.useFakeTimers('modern');
jest.setSystemTime(new Date('2020-03-09').getTime());

describe('registerClusterLevelMetrics()', () => {
  const monitoringCollection = monitoringCollectionMock.createSetup();
  const coreSetup = coreMock.createSetup() as unknown as CoreSetup<AlertingPluginsStart, unknown>;
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

  it('should get overdue rules', async () => {
    const metrics: Record<string, MetricSet> = {};
    monitoringCollection.registerMetricSet.mockImplementation((set) => {
      metrics[set.id] = set;
    });
    registerClusterLevelMetrics({ monitoringCollection, core: coreSetup });

    const metricTypes = Object.keys(metrics);
    expect(metricTypes.length).toBe(1);
    expect(metricTypes[0]).toBe('kibana_alerting_cluster_rules');

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

    const result = (await metrics.kibana_alerting_cluster_rules.fetch()) as Record<
      string,
      ValidMetricResult
    >;
    expect(result.overdue_count).toBe(docs.length);
    expect(result.overdue_delay_p50).toBe(1000);
    expect(result.overdue_delay_p99).toBe(1000);
    expect(taskManagerFetch).toHaveBeenCalledWith({
      query: {
        bool: {
          must: [
            {
              term: {
                'task.scope': {
                  value: 'alerting',
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
    const metrics: Record<string, MetricSet> = {};
    monitoringCollection.registerMetricSet.mockImplementation((set) => {
      metrics[set.id] = set;
    });
    registerClusterLevelMetrics({ monitoringCollection, core: coreSetup });

    const metricTypes = Object.keys(metrics);
    expect(metricTypes.length).toBe(1);
    expect(metricTypes[0]).toBe('kibana_alerting_cluster_rules');

    const nowInMs = +new Date();
    const docs = [
      { runAt: nowInMs - 1000 },
      { runAt: nowInMs - 2000 },
      { runAt: nowInMs - 3000 },
      { runAt: nowInMs - 4000 },
      { runAt: nowInMs - 40000 },
    ];
    taskManagerFetch.mockImplementation(async () => ({ docs }));

    const result = (await metrics.kibana_alerting_cluster_rules.fetch()) as Record<
      string,
      ValidMetricResult
    >;
    expect(result.overdue_count).toBe(docs.length);
    expect(result.overdue_delay_p50).toBe(3000);
    expect(result.overdue_delay_p99).toBe(40000);
  });
});
