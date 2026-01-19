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
        grouping: {
          service: {
            environment: 'development',
            name: 'opbeans-java',
          },
          transaction: {
            type: 'request',
          },
        },
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
      groupBy: ['service.name', 'service.environment', 'transaction.type', 'transaction.name'],
    };
    await executor({ params });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(1);
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: expect.stringContaining(
          'http://localhost:5601/eyr/app/observability/alerts/'
        ),
        environment: 'development',
        grouping: {
          service: {
            environment: 'development',
            name: 'opbeans-java',
          },
          transaction: {
            type: 'request',
            name: 'GET /products',
          },
        },
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
        grouping: {
          service: {
            environment: 'development',
            name: 'opbeans-java',
          },
          transaction: {
            type: 'request',
          },
        },
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
              key: ['opbeans-java', 'ENVIRONMENT_NOT_DEFINED', 'request', 'tx-java'],
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
      groupBy: ['service.name', 'service.environment', 'transaction.type', 'transaction.name'],
    };
    await executor({ params });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(1);
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: expect.stringContaining(
          'http://localhost:5601/eyr/app/observability/alerts/'
        ),
        environment: 'Not defined',
        grouping: {
          service: {
            environment: 'ENVIRONMENT_NOT_DEFINED',
            name: 'opbeans-java',
          },
          transaction: {
            type: 'request',
            name: 'tx-java',
          },
        },
        interval: '5 mins',
        reason:
          'Avg. latency is 5.5 s in the last 5 mins for service: opbeans-java, env: Not defined, type: request, name: tx-java. Alert when > 3.0 s.',
        serviceName: 'opbeans-java',
        threshold: 3000,
        transactionName: 'tx-java',
        transactionType: 'request',
        triggerValue: '5,500 ms',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/opbeans-java?transactionType=request&environment=ENVIRONMENT_NOT_DEFINED',
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
  it('sends alert when service.environment is ENVIRONMENT_ALL', async () => {
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
              key: ['opbeans-java', 'ENVIRONMENT_ALL', 'request', 'tx-java'],
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
      groupBy: ['service.name', 'service.environment', 'transaction.type', 'transaction.name'],
    };
    await executor({ params });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(1);
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: expect.stringContaining(
          'http://localhost:5601/eyr/app/observability/alerts/'
        ),
        environment: 'All',
        grouping: {
          service: {
            environment: 'ENVIRONMENT_ALL',
            name: 'opbeans-java',
          },
          transaction: {
            type: 'request',
            name: 'tx-java',
          },
        },
        interval: '5 mins',
        reason:
          'Avg. latency is 5.5 s in the last 5 mins for service: opbeans-java, env: All, type: request, name: tx-java. Alert when > 3.0 s.',
        serviceName: 'opbeans-java',
        threshold: 3000,
        transactionName: 'tx-java',
        transactionType: 'request',
        triggerValue: '5,500 ms',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/opbeans-java?transactionType=request&environment=ENVIRONMENT_ALL',
      },
      id: 'opbeans-java_ENVIRONMENT_ALL_request_tx-java',
      payload: {
        'kibana.alert.evaluation.threshold': 3000000,
        'kibana.alert.evaluation.value': 5500000,
        'kibana.alert.reason':
          'Avg. latency is 5.5 s in the last 5 mins for service: opbeans-java, env: All, type: request, name: tx-java. Alert when > 3.0 s.',
        'processor.event': 'transaction',
        'service.environment': 'ENVIRONMENT_ALL',
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
        grouping: {
          service: {
            environment: 'development',
            name: 'opbeans-java',
          },
          transaction: {
            type: 'request',
          },
        },
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
  it('sends recovered alert with their context', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerTransactionDurationRuleType(dependencies);

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 0,
        },
      },
      aggregations: {
        series: {
          buckets: [],
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

    services.alertsClient.getRecoveredAlerts.mockReturnValue([
      {
        alert: {
          getId: jest.fn().mockReturnValue('test-id'),
          getUuid: jest.fn().mockReturnValue('test-uuid'),
          scheduledExecutionOptions: undefined,
          meta: {},
          state: {},
          context: {},
          id: 'synthtrace-high-cardinality-0_Synthtrace: many_errors_request',
          alertAsData: undefined,
        },
        hit: {
          'processor.event': 'transaction',
          'kibana.alert.evaluation.value': 1000000,
          'kibana.alert.evaluation.threshold': 149000,
          'kibana.alert.reason':
            'Avg. latency is 1,000 ms in the last 5 days for service: synthtrace-high-cardinality-0, env: Synthtrace: many_errors, type: request. Alert when > 149 ms.',
          'agent.name': 'java',
          labels: { custom_label: [] },
          'service.environment': 'Synthtrace: many_errors',
          'service.name': 'synthtrace-high-cardinality-0',
          'transaction.type': 'request',
          'kibana.alert.rule.category': 'Latency threshold',
          'kibana.alert.rule.consumer': 'alerts',
          'kibana.alert.rule.execution.uuid': '646b1ca4-5799-4b3f-b253-593941da2c2f',
          'kibana.alert.rule.name': 'Latency threshold rule',
          'kibana.alert.rule.parameters': {
            aggregationType: 'avg',
            threshold: 149,
            windowSize: 5,
            windowUnit: 'd',
            environment: 'ENVIRONMENT_ALL',
            groupBy: ['service.name', 'service.environment', 'transaction.type'],
          },
          'kibana.alert.rule.producer': 'apm',
          'kibana.alert.rule.revision': 15,
          'kibana.alert.rule.rule_type_id': 'apm.transaction_duration',
          'kibana.alert.rule.tags': [],
          'kibana.alert.rule.uuid': '9c4a8e4f-b55c-426c-b4cc-fd2c9cb8bf89',
          'kibana.space_ids': ['default'],
          '@timestamp': '2025-02-20T12:40:40.956Z',
          'event.action': 'open',
          'event.kind': 'signal',
          'kibana.alert.rule.execution.timestamp': '2025-02-20T12:40:40.956Z',
          'kibana.alert.action_group': 'threshold_met',
          'kibana.alert.flapping': false,
          'kibana.alert.flapping_history': [true],
          'kibana.alert.instance.id':
            'synthtrace-high-cardinality-0_Synthtrace: many_errors_request',
          'kibana.alert.maintenance_window_ids': [],
          'kibana.alert.consecutive_matches': 1,
          'kibana.alert.status': 'active',
          'kibana.alert.uuid': 'b60476e6-f4e3-47a1-ac1a-a53616411b66',
          'kibana.alert.severity_improving': false,
          'kibana.alert.workflow_status': 'open',
          'kibana.alert.duration.us': 0,
          'kibana.alert.start': '2025-02-20T12:40:40.956Z',
          'kibana.alert.time_range': { gte: '2025-02-20T12:40:40.956Z' },
          'kibana.version': '9.1.0',
          tags: [],
        },
      },
    ]);
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
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'Synthtrace: many_errors',
        grouping: {
          service: {
            environment: 'Synthtrace: many_errors',
            name: 'synthtrace-high-cardinality-0',
          },
          transaction: {
            type: 'request',
          },
        },
        interval: '5 mins',
        reason:
          'Avg. latency is 1,000 ms in the last 5 days for service: synthtrace-high-cardinality-0, env: Synthtrace: many_errors, type: request. Alert when > 149 ms.',
        serviceName: 'synthtrace-high-cardinality-0',
        threshold: 3000,
        transactionName: 'GET /orders',
        transactionType: 'request',
        triggerValue: '1,000 ms',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/synthtrace-high-cardinality-0?transactionType=request&environment=Synthtrace%3A%20many_errors',
      },
      id: 'test-id',
    });
  });
});
