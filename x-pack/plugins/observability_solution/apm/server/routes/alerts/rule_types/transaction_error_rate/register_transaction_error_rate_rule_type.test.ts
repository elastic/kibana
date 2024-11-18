/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTransactionErrorRateRuleType } from './register_transaction_error_rate_rule_type';
import { createRuleTypeMocks } from '../../test_utils';

describe('Transaction error rate alert', () => {
  it("doesn't send an alert when rate is less than threshold", async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerTransactionErrorRateRuleType({
      ...dependencies,
    });

    const params = { threshold: 1 };

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 0,
        },
      },
      took: 0,
      timed_out: false,
      aggregations: {
        series: {
          buckets: [],
        },
      },
      _shards: {
        failed: 0,
        skipped: 0,
        successful: 1,
        total: 1,
      },
    });

    await executor({ params });
    expect(services.alertsClient.report).not.toBeCalled();
  });

  it('sends alerts for services that exceeded the threshold', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerTransactionErrorRateRuleType({
      ...dependencies,
    });

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
          buckets: [
            {
              key: ['foo', 'env-foo', 'type-foo'],
              outcomes: {
                buckets: [
                  {
                    key: 'success',
                    doc_count: 90,
                  },
                  {
                    key: 'failure',
                    doc_count: 10,
                  },
                ],
              },
            },
            {
              key: ['bar', 'env-bar', 'type-bar'],
              outcomes: {
                buckets: [
                  {
                    key: 'success',
                    doc_count: 90,
                  },
                  {
                    key: 'failure',
                    doc_count: 1,
                  },
                ],
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
      threshold: 10,
      windowSize: 5,
      windowUnit: 'm',
    };

    await executor({ params });

    expect(services.alertsClient.report).toHaveBeenCalledTimes(1);

    expect(services.alertsClient.report).toHaveBeenCalledWith({
      actionGroup: 'threshold_met',
      id: 'foo_env-foo_type-foo',
    });
    expect(services.alertsClient.report).not.toHaveBeenCalledWith({
      actionGroup: 'threshold_met',
      id: 'bar_env-bar_type-bar',
    });

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo',
        interval: '5 mins',
        reason:
          'Failed transactions is 10% in the last 5 mins for service: foo, env: env-foo, type: type-foo. Alert when > 10%.',
        serviceName: 'foo',
        threshold: 10,
        transactionName: undefined,
        transactionType: 'type-foo',
        triggerValue: '10',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/foo?transactionType=type-foo&environment=env-foo',
      },
      id: 'foo_env-foo_type-foo',
      payload: {
        'kibana.alert.evaluation.threshold': 10,
        'kibana.alert.evaluation.value': 10,
        'kibana.alert.reason':
          'Failed transactions is 10% in the last 5 mins for service: foo, env: env-foo, type: type-foo. Alert when > 10%.',
        'processor.event': 'transaction',
        'service.environment': 'env-foo',
        'service.name': 'foo',
        'transaction.name': undefined,
        'transaction.type': 'type-foo',
      },
    });
  });

  it('sends alert when rule is configured with group by on transaction.name', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerTransactionErrorRateRuleType({
      ...dependencies,
    });

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
              key: ['foo', 'env-foo', 'type-foo', 'tx-name-foo'],
              outcomes: {
                buckets: [
                  {
                    key: 'success',
                    doc_count: 90,
                  },
                  {
                    key: 'failure',
                    doc_count: 10,
                  },
                ],
              },
            },
            {
              key: ['bar', 'env-bar', 'type-bar', 'tx-name-bar'],
              outcomes: {
                buckets: [
                  {
                    key: 'success',
                    doc_count: 90,
                  },
                  {
                    key: 'failure',
                    doc_count: 1,
                  },
                ],
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
      threshold: 10,
      windowSize: 5,
      windowUnit: 'm',
      groupBy: ['service.name', 'service.environment', 'transaction.type', 'transaction.name'],
    };

    await executor({ params });

    expect(services.alertsClient.report).toHaveBeenCalledTimes(1);

    expect(services.alertsClient.report).toHaveBeenCalledWith({
      actionGroup: 'threshold_met',
      id: 'foo_env-foo_type-foo_tx-name-foo',
    });
    expect(services.alertsClient.report).not.toHaveBeenCalledWith({
      actionGroup: 'threshold_met',
      id: 'bar_env-bar_type-bar_tx-name-bar',
    });

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo',
        interval: '5 mins',
        reason:
          'Failed transactions is 10% in the last 5 mins for service: foo, env: env-foo, type: type-foo, name: tx-name-foo. Alert when > 10%.',
        serviceName: 'foo',
        threshold: 10,
        transactionName: 'tx-name-foo',
        transactionType: 'type-foo',
        triggerValue: '10',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/foo?transactionType=type-foo&environment=env-foo',
      },
      id: 'foo_env-foo_type-foo_tx-name-foo',
      payload: {
        'kibana.alert.evaluation.threshold': 10,
        'kibana.alert.evaluation.value': 10,
        'kibana.alert.reason':
          'Failed transactions is 10% in the last 5 mins for service: foo, env: env-foo, type: type-foo, name: tx-name-foo. Alert when > 10%.',
        'processor.event': 'transaction',
        'service.environment': 'env-foo',
        'service.name': 'foo',
        'transaction.name': 'tx-name-foo',
        'transaction.type': 'type-foo',
      },
    });
  });

  it('sends alert when rule is configured with preselected group by', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerTransactionErrorRateRuleType({
      ...dependencies,
    });

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
              key: ['foo', 'env-foo', 'type-foo'],
              outcomes: {
                buckets: [
                  {
                    key: 'success',
                    doc_count: 90,
                  },
                  {
                    key: 'failure',
                    doc_count: 10,
                  },
                ],
              },
            },
            {
              key: ['bar', 'env-bar', 'type-bar'],
              outcomes: {
                buckets: [
                  {
                    key: 'success',
                    doc_count: 90,
                  },
                  {
                    key: 'failure',
                    doc_count: 1,
                  },
                ],
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
      threshold: 10,
      windowSize: 5,
      windowUnit: 'm',
      groupBy: ['service.name', 'service.environment', 'transaction.type'],
    };

    services.alertsClient.report.mockReturnValue({ uuid: 'test-uuid' });

    await executor({ params });

    expect(services.alertsClient.report).toHaveBeenCalledTimes(1);

    expect(services.alertsClient.report).toHaveBeenCalledWith({
      actionGroup: 'threshold_met',
      id: 'foo_env-foo_type-foo',
    });
    expect(services.alertsClient.report).not.toHaveBeenCalledWith({
      actionGroup: 'threshold_met',
      id: 'bar_env-bar_type-bar',
    });

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo',
        interval: '5 mins',
        reason:
          'Failed transactions is 10% in the last 5 mins for service: foo, env: env-foo, type: type-foo. Alert when > 10%.',
        serviceName: 'foo',
        threshold: 10,
        transactionName: undefined,
        transactionType: 'type-foo',
        triggerValue: '10',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/foo?transactionType=type-foo&environment=env-foo',
      },
      id: 'foo_env-foo_type-foo',
      payload: {
        'kibana.alert.evaluation.threshold': 10,
        'kibana.alert.evaluation.value': 10,
        'kibana.alert.reason':
          'Failed transactions is 10% in the last 5 mins for service: foo, env: env-foo, type: type-foo. Alert when > 10%.',
        'processor.event': 'transaction',
        'service.environment': 'env-foo',
        'service.name': 'foo',
        'transaction.name': undefined,
        'transaction.type': 'type-foo',
      },
    });
  });

  it('sends alert when service.environment field does not exist in the source', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerTransactionErrorRateRuleType({
      ...dependencies,
    });

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
              key: ['foo', 'ENVIRONMENT_NOT_DEFINED', 'type-foo'],
              outcomes: {
                buckets: [
                  {
                    key: 'success',
                    doc_count: 90,
                  },
                  {
                    key: 'failure',
                    doc_count: 10,
                  },
                ],
              },
            },
            {
              key: ['bar', 'ENVIRONMENT_NOT_DEFINED', 'type-bar'],
              outcomes: {
                buckets: [
                  {
                    key: 'success',
                    doc_count: 90,
                  },
                  {
                    key: 'failure',
                    doc_count: 1,
                  },
                ],
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
      threshold: 10,
      windowSize: 5,
      windowUnit: 'm',
      groupBy: ['service.name', 'service.environment', 'transaction.type'],
    };

    await executor({ params });

    expect(services.alertsClient.report).toHaveBeenCalledTimes(1);

    expect(services.alertsClient.report).toHaveBeenCalledWith({
      actionGroup: 'threshold_met',
      id: 'foo_ENVIRONMENT_NOT_DEFINED_type-foo',
    });
    expect(services.alertsClient.report).not.toHaveBeenCalledWith({
      actionGroup: 'threshold_met',
      id: 'bar_ENVIRONMENT_NOT_DEFINED_type-bar',
    });

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'Not defined',
        interval: '5 mins',
        reason:
          'Failed transactions is 10% in the last 5 mins for service: foo, env: Not defined, type: type-foo. Alert when > 10%.',
        serviceName: 'foo',
        threshold: 10,
        transactionName: undefined,
        transactionType: 'type-foo',
        triggerValue: '10',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/foo?transactionType=type-foo&environment=ENVIRONMENT_ALL',
      },
      id: 'foo_ENVIRONMENT_NOT_DEFINED_type-foo',
      payload: {
        'kibana.alert.evaluation.threshold': 10,
        'kibana.alert.evaluation.value': 10,
        'kibana.alert.reason':
          'Failed transactions is 10% in the last 5 mins for service: foo, env: Not defined, type: type-foo. Alert when > 10%.',
        'processor.event': 'transaction',
        'service.environment': 'ENVIRONMENT_NOT_DEFINED',
        'service.name': 'foo',
        'transaction.name': undefined,
        'transaction.type': 'type-foo',
      },
    });
  });

  it('sends alert when rule is configured with a filter query', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerTransactionErrorRateRuleType({
      ...dependencies,
    });

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 1,
        },
      },
      aggregations: {
        series: {
          buckets: [
            {
              key: ['bar', 'env-bar', 'type-bar'],
              outcomes: {
                buckets: [
                  {
                    key: 'success',
                    doc_count: 90,
                  },
                  {
                    key: 'failure',
                    doc_count: 10,
                  },
                ],
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
      threshold: 10,
      windowSize: 5,
      windowUnit: 'm',
      searchConfiguration: {
        query: {
          query:
            'service.name: bar and service.environment: env-bar and transaction.type: type-bar',
          language: 'kuery',
        },
      },
      groupBy: ['service.name', 'service.environment', 'transaction.type'],
    };

    await executor({ params });

    expect(services.alertsClient.report).toHaveBeenCalledTimes(1);

    expect(services.alertsClient.report).toHaveBeenCalledWith({
      actionGroup: 'threshold_met',
      id: 'bar_env-bar_type-bar',
    });

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-bar',
        interval: '5 mins',
        reason:
          'Failed transactions is 10% in the last 5 mins for service: bar, env: env-bar, type: type-bar. Alert when > 10%.',
        serviceName: 'bar',
        threshold: 10,
        transactionName: undefined,
        transactionType: 'type-bar',
        triggerValue: '10',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/bar?transactionType=type-bar&environment=env-bar',
      },
      id: 'bar_env-bar_type-bar',
      payload: {
        'kibana.alert.evaluation.threshold': 10,
        'kibana.alert.evaluation.value': 10,
        'kibana.alert.reason':
          'Failed transactions is 10% in the last 5 mins for service: bar, env: env-bar, type: type-bar. Alert when > 10%.',
        'processor.event': 'transaction',
        'service.environment': 'env-bar',
        'service.name': 'bar',
        'transaction.name': undefined,
        'transaction.type': 'type-bar',
      },
    });
  });
});
