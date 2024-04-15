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
    const { services, dependencies, executor } = createRuleTypeMocks();

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
              key: ['opbeans-java', 'development', 'request'],
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
    services.alertsClient.report.mockReturnValue({ uuid: 'test-uuid' });

    const params = {
      threshold: 3000,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      aggregationType: 'avg',
      transactionName: 'GET /orders',
    };
    await executor({ params });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(1);
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: expect.stringContaining(
          'http://localhost:5601/eyr/app/observability/alerts/'
        ),
        environment: 'development',
        interval: '5 mins',
        reason:
          'Avg. latency is 5.5 s in the last 5 mins for service: opbeans-java, env: development, type: request. Alert when > 3.0 s.',
        serviceName: 'opbeans-java',
        threshold: 3000,
        transactionName: 'GET /orders',
        transactionType: 'request',
        triggerValue: '5,500 ms',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/opbeans-java?transactionType=request&environment=development',
      },
      id: 'opbeans-java_development_request',
      payload: {
        'kibana.alert.evaluation.threshold': 3000000,
        'kibana.alert.evaluation.value': 5500000,
        'kibana.alert.reason':
          'Avg. latency is 5.5 s in the last 5 mins for service: opbeans-java, env: development, type: request. Alert when > 3.0 s.',
        'processor.event': 'transaction',
        'service.environment': 'development',
        'service.name': 'opbeans-java',
        'transaction.name': 'GET /orders',
        'transaction.type': 'request',
      },
    });
  });

  it('sends alert when rule is configured with group by on transaction.name', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

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
              key: ['opbeans-java', 'development', 'request', 'GET /products'],
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
    services.alertsClient.report.mockReturnValue({ uuid: 'test-uuid' });

    const params = {
      threshold: 3000,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      aggregationType: 'avg',
      groupBy: [
        'service.name',
        'service.environment',
        'transaction.type',
        'transaction.name',
      ],
    };
    await executor({ params });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(1);
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: expect.stringContaining(
          'http://localhost:5601/eyr/app/observability/alerts/'
        ),
        environment: 'development',
        interval: '5 mins',
        reason:
          'Avg. latency is 5.5 s in the last 5 mins for service: opbeans-java, env: development, type: request, name: GET /products. Alert when > 3.0 s.',
        serviceName: 'opbeans-java',
        threshold: 3000,
        transactionName: 'GET /products',
        transactionType: 'request',
        triggerValue: '5,500 ms',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/opbeans-java?transactionType=request&environment=development',
      },
      id: 'opbeans-java_development_request_GET /products',
      payload: {
        'kibana.alert.evaluation.threshold': 3000000,
        'kibana.alert.evaluation.value': 5500000,
        'kibana.alert.reason':
          'Avg. latency is 5.5 s in the last 5 mins for service: opbeans-java, env: development, type: request, name: GET /products. Alert when > 3.0 s.',
        'processor.event': 'transaction',
        'service.environment': 'development',
        'service.name': 'opbeans-java',
        'transaction.name': 'GET /products',
        'transaction.type': 'request',
      },
    });
  });

  it('sends alert when rule is configured with preselected group by', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

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
              key: ['opbeans-java', 'development', 'request'],
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
    services.alertsClient.report.mockReturnValue({ uuid: 'test-uuid' });

    const params = {
      threshold: 3000,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      aggregationType: 'avg',
      groupBy: ['service.name', 'service.environment', 'transaction.type'],
    };

    await executor({ params });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(1);
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: expect.stringContaining(
          'http://localhost:5601/eyr/app/observability/alerts/'
        ),
        environment: 'development',
        interval: '5 mins',
        reason:
          'Avg. latency is 5.5 s in the last 5 mins for service: opbeans-java, env: development, type: request. Alert when > 3.0 s.',
        serviceName: 'opbeans-java',
        threshold: 3000,
        transactionName: undefined,
        transactionType: 'request',
        triggerValue: '5,500 ms',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/opbeans-java?transactionType=request&environment=development',
      },
      id: 'opbeans-java_development_request',
      payload: {
        'kibana.alert.evaluation.threshold': 3000000,
        'kibana.alert.evaluation.value': 5500000,
        'kibana.alert.reason':
          'Avg. latency is 5.5 s in the last 5 mins for service: opbeans-java, env: development, type: request. Alert when > 3.0 s.',
        'processor.event': 'transaction',
        'service.environment': 'development',
        'service.name': 'opbeans-java',
        'transaction.name': undefined,
        'transaction.type': 'request',
      },
    });
  });

  it('sends alert when service.environment field does not exist in the source', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

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
                'tx-java',
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
    services.alertsClient.report.mockReturnValue({ uuid: 'test-uuid' });

    const params = {
      threshold: 3000,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: 'request',
      serviceName: 'opbeans-java',
      aggregationType: 'avg',
      groupBy: [
        'service.name',
        'service.environment',
        'transaction.type',
        'transaction.name',
      ],
    };
    await executor({ params });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(1);
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: expect.stringContaining(
          'http://localhost:5601/eyr/app/observability/alerts/'
        ),
        environment: 'Not defined',
        interval: '5 mins',
        reason:
          'Avg. latency is 5.5 s in the last 5 mins for service: opbeans-java, env: Not defined, type: request, name: tx-java. Alert when > 3.0 s.',
        serviceName: 'opbeans-java',
        threshold: 3000,
        transactionName: 'tx-java',
        transactionType: 'request',
        triggerValue: '5,500 ms',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/opbeans-java?transactionType=request&environment=ENVIRONMENT_ALL',
      },
      id: 'opbeans-java_ENVIRONMENT_NOT_DEFINED_request_tx-java',
      payload: {
        'kibana.alert.evaluation.threshold': 3000000,
        'kibana.alert.evaluation.value': 5500000,
        'kibana.alert.reason':
          'Avg. latency is 5.5 s in the last 5 mins for service: opbeans-java, env: Not defined, type: request, name: tx-java. Alert when > 3.0 s.',
        'processor.event': 'transaction',
        'service.environment': 'ENVIRONMENT_NOT_DEFINED',
        'service.name': 'opbeans-java',
        'transaction.name': 'tx-java',
        'transaction.type': 'request',
      },
    });
  });

  it('sends alert when rule is configured with a filter query', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

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
              key: ['opbeans-java', 'development', 'request'],
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
    services.alertsClient.report.mockReturnValue({ uuid: 'test-uuid' });

    const params = {
      threshold: 3000,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: undefined,
      serviceName: undefined,
      aggregationType: 'avg',
      searchConfiguration: {
        query: {
          query: 'service.name: opbeans-java and transaction.type: request',
          language: 'kuery',
        },
      },
      groupBy: ['service.name', 'service.environment', 'transaction.type'],
    };

    await executor({ params });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(1);
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: expect.stringContaining(
          'http://localhost:5601/eyr/app/observability/alerts/'
        ),
        environment: 'development',
        interval: '5 mins',
        reason:
          'Avg. latency is 5.5 s in the last 5 mins for service: opbeans-java, env: development, type: request. Alert when > 3.0 s.',
        serviceName: 'opbeans-java',
        threshold: 3000,
        transactionName: undefined,
        transactionType: 'request',
        triggerValue: '5,500 ms',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/opbeans-java?transactionType=request&environment=development',
      },
      id: 'opbeans-java_development_request',
      payload: {
        'kibana.alert.evaluation.threshold': 3000000,
        'kibana.alert.evaluation.value': 5500000,
        'kibana.alert.reason':
          'Avg. latency is 5.5 s in the last 5 mins for service: opbeans-java, env: development, type: request. Alert when > 3.0 s.',
        'processor.event': 'transaction',
        'service.environment': 'development',
        'service.name': 'opbeans-java',
        'transaction.name': undefined,
        'transaction.type': 'request',
      },
    });
  });
});
