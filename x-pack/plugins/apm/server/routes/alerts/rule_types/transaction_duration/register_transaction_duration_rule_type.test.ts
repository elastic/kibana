/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTransactionDurationRuleType } from './register_transaction_duration_rule_type';
import { createRuleTypeMocks } from '../../test_utils';

describe('registerTransactionDurationRuleType', () => {
  it('sends alert when value is greater than threshold', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

    registerTransactionDurationRuleType(dependencies);

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 2,
        },
      },
      aggregations: {
        series: {
          buckets: [
            {
              key: ['opbeans-java', 'ENVIRONMENT_NOT_DEFINED', 'request'],
              avgLatency: {
                value: 5500000,
              },
            },
          ],
        },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        skipped: 0,
        successful: 1,
        total: 1,
      },
    });

    const params = {
      threshold: 3000,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      aggregationType: 'avg',
    };
    await executor({ params });
    expect(scheduleActions).toHaveBeenCalledTimes(1);
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      alertDetailsUrl: expect.stringContaining(
        'http://localhost:5601/eyr/app/observability/alerts/'
      ),
      environment: 'Not defined',
      interval: `5 mins`,
      reason:
        'Avg. latency is 5,500 ms in the last 5 mins for opbeans-java. Alert when > 3,000 ms.',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      threshold: 3000,
      triggerValue: '5,500 ms',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/opbeans-java?transactionType=request&environment=ENVIRONMENT_ALL',
    });
  });

  it('sends alert when rule is configured with group by on service.version', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

    registerTransactionDurationRuleType(dependencies);

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 2,
        },
      },
      aggregations: {
        series: {
          buckets: [
            {
              key: [
                'opbeans-java',
                'ENVIRONMENT_NOT_DEFINED',
                'request',
                '1.0.0',
              ],
              avgLatency: {
                value: 5500000,
              },
            },
          ],
        },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        skipped: 0,
        successful: 1,
        total: 1,
      },
    });

    const params = {
      threshold: 3000,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      aggregationType: 'avg',
      groupBy: 'service.version',
    };
    await executor({ params });
    expect(scheduleActions).toHaveBeenCalledTimes(1);
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      alertDetailsUrl: expect.stringContaining(
        'http://localhost:5601/eyr/app/observability/alerts/'
      ),
      environment: 'Not defined',
      interval: `5 mins`,
      reason:
        'Avg. latency is 5,500 ms in the last 5 mins for opbeans-java. Alert when > 3,000 ms.',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      threshold: 3000,
      triggerValue: '5,500 ms',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/opbeans-java?transactionType=request&environment=ENVIRONMENT_ALL',
      'service.version': '1.0.0',
    });
  });

  it('sends alert when rule is configured with multiple group by fields', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

    registerTransactionDurationRuleType(dependencies);

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 2,
        },
      },
      aggregations: {
        series: {
          buckets: [
            {
              key: [
                'opbeans-java',
                'ENVIRONMENT_NOT_DEFINED',
                'request',
                '1.0.0',
                '16.10.1',
              ],
              avgLatency: {
                value: 5500000,
              },
            },
          ],
        },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        skipped: 0,
        successful: 1,
        total: 1,
      },
    });

    const params = {
      threshold: 3000,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      aggregationType: 'avg',
      groupBy: ['service.version', 'service.runtime.version'],
    };
    await executor({ params });
    expect(scheduleActions).toHaveBeenCalledTimes(1);
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      alertDetailsUrl: expect.stringContaining(
        'http://localhost:5601/eyr/app/observability/alerts/'
      ),
      environment: 'Not defined',
      interval: `5 mins`,
      reason:
        'Avg. latency is 5,500 ms in the last 5 mins for opbeans-java. Alert when > 3,000 ms.',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      threshold: 3000,
      triggerValue: '5,500 ms',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/opbeans-java?transactionType=request&environment=ENVIRONMENT_ALL',
      'service.version': '1.0.0',
      'service.runtime.version': '16.10.1',
    });
  });

  it('sends alert when rule is configured with no group by', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

    registerTransactionDurationRuleType(dependencies);

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 2,
        },
      },
      aggregations: {
        series: {
          buckets: [
            {
              key: ['opbeans-java', 'ENVIRONMENT_NOT_DEFINED', 'request'],
              avgLatency: {
                value: 5500000,
              },
            },
          ],
        },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        skipped: 0,
        successful: 1,
        total: 1,
      },
    });

    const params = {
      threshold: 3000,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      aggregationType: 'avg',
      groupBy: undefined,
    };
    await executor({ params });
    expect(scheduleActions).toHaveBeenCalledTimes(1);
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      alertDetailsUrl: expect.stringContaining(
        'http://localhost:5601/eyr/app/observability/alerts/'
      ),
      environment: 'Not defined',
      interval: `5 mins`,
      reason:
        'Avg. latency is 5,500 ms in the last 5 mins for opbeans-java. Alert when > 3,000 ms.',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      threshold: 3000,
      triggerValue: '5,500 ms',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/opbeans-java?transactionType=request&environment=ENVIRONMENT_ALL',
    });
  });

  it('sends alert when rule is configured with group by field that does not exist in the source', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

    registerTransactionDurationRuleType(dependencies);

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 2,
        },
      },
      aggregations: {
        series: {
          buckets: [
            {
              key: [
                'opbeans-java',
                'ENVIRONMENT_NOT_DEFINED',
                'request',
                'KUBERNETES_POD_NAME_NOT_DEFINED',
                'CONTAINER_ID_NOT_DEFINED',
              ],
              avgLatency: {
                value: 5500000,
              },
            },
          ],
        },
      },
      took: 0,
      timed_out: false,
      _shards: {
        failed: 0,
        skipped: 0,
        successful: 1,
        total: 1,
      },
    });

    const params = {
      threshold: 3000,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      aggregationType: 'avg',
      groupBy: ['kubernetes.pod.name', 'container.id'],
    };
    await executor({ params });
    expect(scheduleActions).toHaveBeenCalledTimes(1);
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      alertDetailsUrl: expect.stringContaining(
        'http://localhost:5601/eyr/app/observability/alerts/'
      ),
      environment: 'Not defined',
      interval: `5 mins`,
      reason:
        'Avg. latency is 5,500 ms in the last 5 mins for opbeans-java. Alert when > 3,000 ms.',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      threshold: 3000,
      triggerValue: '5,500 ms',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/opbeans-java?transactionType=request&environment=ENVIRONMENT_ALL',
      'kubernetes.pod.name': 'KUBERNETES_POD_NAME_NOT_DEFINED',
      'container.id': 'CONTAINER_ID_NOT_DEFINED',
    });
  });
});
