/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerErrorCountRuleType } from './register_error_count_rule_type';
import { createRuleTypeMocks } from '../../test_utils';

describe('Error count alert', () => {
  it("doesn't send an alert when error count is less than threshold", async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerErrorCountRuleType(dependencies);

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

  it('sends alerts with service name and environment for those that exceeded the threshold', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerErrorCountRuleType(dependencies);

    const params = {
      threshold: 2,
      windowSize: 5,
      windowUnit: 'm',
    };

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 2,
        },
      },
      aggregations: {
        error_counts: {
          buckets: [
            {
              key: ['foo', 'env-foo'],
              doc_count: 5,
              latest: {
                top: [
                  {
                    metrics: {
                      'service.name': 'foo',
                      'service.environment': 'env-foo',
                    },
                  },
                ],
              },
            },
            {
              key: ['foo', 'env-foo-2'],
              doc_count: 4,
              latest: {
                top: [
                  {
                    metrics: {
                      'service.name': 'foo',
                      'service.environment': 'env-foo-2',
                    },
                  },
                ],
              },
            },
            {
              key: ['bar', 'env-bar'],
              doc_count: 3,
              latest: {
                top: [
                  {
                    metrics: {
                      'service.name': 'bar',
                      'service.environment': 'env-bar',
                    },
                  },
                ],
              },
            },
            {
              key: ['bar', 'env-bar-2'],
              doc_count: 1,
              latest: {
                top: [
                  {
                    metrics: {
                      'service.name': 'bar',
                      'service.environment': 'env-bar-2',
                    },
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

    await executor({ params });
    ['foo_env-foo', 'foo_env-foo-2', 'bar_env-bar'].forEach((instanceName) =>
      expect(services.alertsClient.report).toHaveBeenCalledWith({
        actionGroup: 'threshold_met',
        id: instanceName,
      })
    );

    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(3);

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'env-foo',
            name: 'foo',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 5 in the last 5 mins for service: foo, env: env-foo. Alert when > 2.',
        serviceName: 'foo',
        threshold: 2,
        triggerValue: 5,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo',
      },
      id: 'foo_env-foo',
      payload: {
        'error.grouping_key': undefined,
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 5,
        'kibana.alert.reason':
          'Error count is 5 in the last 5 mins for service: foo, env: env-foo. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-foo',
        'service.name': 'foo',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo-2',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'env-foo-2',
            name: 'foo',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 4 in the last 5 mins for service: foo, env: env-foo-2. Alert when > 2.',
        serviceName: 'foo',
        threshold: 2,
        triggerValue: 4,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo-2',
      },
      id: 'foo_env-foo-2',
      payload: {
        'error.grouping_key': undefined,
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 4,
        'kibana.alert.reason':
          'Error count is 4 in the last 5 mins for service: foo, env: env-foo-2. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-foo-2',
        'service.name': 'foo',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-bar',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'env-bar',
            name: 'bar',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 3 in the last 5 mins for service: bar, env: env-bar. Alert when > 2.',
        serviceName: 'bar',
        threshold: 2,
        triggerValue: 3,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/bar/errors?environment=env-bar',
      },
      id: 'bar_env-bar',
      payload: {
        'error.grouping_key': undefined,
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 3,
        'kibana.alert.reason':
          'Error count is 3 in the last 5 mins for service: bar, env: env-bar. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-bar',
        'service.name': 'bar',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
  });

  it('sends alert when rule is configured with group by on transaction.name', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerErrorCountRuleType(dependencies);

    const params = {
      threshold: 2,
      windowSize: 5,
      windowUnit: 'm',
      groupBy: ['service.name', 'service.environment', 'transaction.name'],
    };

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 2,
        },
      },
      aggregations: {
        error_counts: {
          buckets: [
            {
              key: ['foo', 'env-foo', 'tx-name-foo'],
              doc_count: 5,
            },
            {
              key: ['foo', 'env-foo-2', 'tx-name-foo-2'],
              doc_count: 4,
            },
            {
              key: ['bar', 'env-bar', 'tx-name-bar'],
              doc_count: 3,
            },
            {
              key: ['bar', 'env-bar-2', 'tx-name-bar-2'],
              doc_count: 1,
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

    await executor({ params });
    ['foo_env-foo_tx-name-foo', 'foo_env-foo-2_tx-name-foo-2', 'bar_env-bar_tx-name-bar'].forEach(
      (instanceName) =>
        expect(services.alertsClient.report).toHaveBeenCalledWith({
          actionGroup: 'threshold_met',
          id: instanceName,
        })
    );

    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(3);

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'env-foo',
            name: 'foo',
          },
          transaction: {
            name: 'tx-name-foo',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 5 in the last 5 mins for service: foo, env: env-foo, name: tx-name-foo. Alert when > 2.',
        serviceName: 'foo',
        threshold: 2,
        transactionName: 'tx-name-foo',
        triggerValue: 5,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo',
      },
      id: 'foo_env-foo_tx-name-foo',
      payload: {
        'error.grouping_key': undefined,
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 5,
        'kibana.alert.reason':
          'Error count is 5 in the last 5 mins for service: foo, env: env-foo, name: tx-name-foo. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-foo',
        'service.name': 'foo',
        'transaction.name': 'tx-name-foo',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo-2',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'env-foo-2',
            name: 'foo',
          },
          transaction: {
            name: 'tx-name-foo-2',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 4 in the last 5 mins for service: foo, env: env-foo-2, name: tx-name-foo-2. Alert when > 2.',
        serviceName: 'foo',
        threshold: 2,
        transactionName: 'tx-name-foo-2',
        triggerValue: 4,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo-2',
      },
      id: 'foo_env-foo-2_tx-name-foo-2',
      payload: {
        'error.grouping_key': undefined,
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 4,
        'kibana.alert.reason':
          'Error count is 4 in the last 5 mins for service: foo, env: env-foo-2, name: tx-name-foo-2. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-foo-2',
        'service.name': 'foo',
        'transaction.name': 'tx-name-foo-2',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-bar',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'env-bar',
            name: 'bar',
          },
          transaction: {
            name: 'tx-name-bar',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 3 in the last 5 mins for service: bar, env: env-bar, name: tx-name-bar. Alert when > 2.',
        serviceName: 'bar',
        threshold: 2,
        transactionName: 'tx-name-bar',
        triggerValue: 3,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/bar/errors?environment=env-bar',
      },
      id: 'bar_env-bar_tx-name-bar',
      payload: {
        'error.grouping_key': undefined,
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 3,
        'kibana.alert.reason':
          'Error count is 3 in the last 5 mins for service: bar, env: env-bar, name: tx-name-bar. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-bar',
        'service.name': 'bar',
        'transaction.name': 'tx-name-bar',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
  });

  it('sends alert when rule is configured with group by on error.grouping_key', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerErrorCountRuleType(dependencies);

    const params = {
      threshold: 2,
      windowSize: 5,
      windowUnit: 'm',
      groupBy: ['service.name', 'service.environment', 'error.grouping_key'],
    };

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 2,
        },
      },
      aggregations: {
        error_counts: {
          buckets: [
            {
              key: ['foo', 'env-foo', 'error-key-foo'],
              doc_count: 5,
            },
            {
              key: ['foo', 'env-foo-2', 'error-key-foo-2'],
              doc_count: 4,
            },
            {
              key: ['bar', 'env-bar', 'error-key-bar'],
              doc_count: 3,
            },
            {
              key: ['bar', 'env-bar-2', 'error-key-bar-2'],
              doc_count: 1,
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

    await executor({ params });
    [
      'foo_env-foo_error-key-foo',
      'foo_env-foo-2_error-key-foo-2',
      'bar_env-bar_error-key-bar',
    ].forEach((instanceName) =>
      expect(services.alertsClient.report).toHaveBeenCalledWith({
        actionGroup: 'threshold_met',
        id: instanceName,
      })
    );

    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(3);

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo',
        errorGroupingKey: 'error-key-foo',
        grouping: {
          service: {
            environment: 'env-foo',
            name: 'foo',
          },
          error: {
            grouping_key: 'error-key-foo',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 5 in the last 5 mins for service: foo, env: env-foo, error key: error-key-foo. Alert when > 2.',
        serviceName: 'foo',
        threshold: 2,
        triggerValue: 5,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo',
      },
      id: 'foo_env-foo_error-key-foo',
      payload: {
        'error.grouping_key': 'error-key-foo',
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 5,
        'kibana.alert.reason':
          'Error count is 5 in the last 5 mins for service: foo, env: env-foo, error key: error-key-foo. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-foo',
        'service.name': 'foo',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo-2',
        errorGroupingKey: 'error-key-foo-2',
        grouping: {
          service: {
            environment: 'env-foo-2',
            name: 'foo',
          },
          error: {
            grouping_key: 'error-key-foo-2',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 4 in the last 5 mins for service: foo, env: env-foo-2, error key: error-key-foo-2. Alert when > 2.',
        serviceName: 'foo',
        threshold: 2,
        triggerValue: 4,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo-2',
      },
      id: 'foo_env-foo-2_error-key-foo-2',
      payload: {
        'error.grouping_key': 'error-key-foo-2',
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 4,
        'kibana.alert.reason':
          'Error count is 4 in the last 5 mins for service: foo, env: env-foo-2, error key: error-key-foo-2. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-foo-2',
        'service.name': 'foo',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-bar',
        errorGroupingKey: 'error-key-bar',
        grouping: {
          service: {
            environment: 'env-bar',
            name: 'bar',
          },
          error: {
            grouping_key: 'error-key-bar',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 3 in the last 5 mins for service: bar, env: env-bar, error key: error-key-bar. Alert when > 2.',
        serviceName: 'bar',
        threshold: 2,
        triggerValue: 3,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/bar/errors?environment=env-bar',
      },
      id: 'bar_env-bar_error-key-bar',
      payload: {
        'error.grouping_key': 'error-key-bar',
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 3,
        'kibana.alert.reason':
          'Error count is 3 in the last 5 mins for service: bar, env: env-bar, error key: error-key-bar. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-bar',
        'service.name': 'bar',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
  });

  it('sends alert when rule is configured with preselected group by', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerErrorCountRuleType(dependencies);

    const params = {
      threshold: 2,
      windowSize: 5,
      windowUnit: 'm',
      groupBy: ['service.name', 'service.environment'],
    };

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 2,
        },
      },
      aggregations: {
        error_counts: {
          buckets: [
            {
              key: ['foo', 'env-foo'],
              doc_count: 5,
            },
            {
              key: ['foo', 'env-foo-2'],
              doc_count: 4,
            },
            {
              key: ['bar', 'env-bar'],
              doc_count: 3,
            },
            {
              key: ['bar', 'env-bar-2'],
              doc_count: 1,
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

    await executor({ params });
    ['foo_env-foo', 'foo_env-foo-2', 'bar_env-bar'].forEach((instanceName) =>
      expect(services.alertsClient.report).toHaveBeenCalledWith({
        actionGroup: 'threshold_met',
        id: instanceName,
      })
    );

    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(3);

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'env-foo',
            name: 'foo',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 5 in the last 5 mins for service: foo, env: env-foo. Alert when > 2.',
        serviceName: 'foo',
        threshold: 2,
        triggerValue: 5,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo',
      },
      id: 'foo_env-foo',
      payload: {
        'error.grouping_key': undefined,
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 5,
        'kibana.alert.reason':
          'Error count is 5 in the last 5 mins for service: foo, env: env-foo. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-foo',
        'service.name': 'foo',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo-2',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'env-foo-2',
            name: 'foo',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 4 in the last 5 mins for service: foo, env: env-foo-2. Alert when > 2.',
        serviceName: 'foo',
        threshold: 2,
        triggerValue: 4,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo-2',
      },
      id: 'foo_env-foo-2',
      payload: {
        'error.grouping_key': undefined,
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 4,
        'kibana.alert.reason':
          'Error count is 4 in the last 5 mins for service: foo, env: env-foo-2. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-foo-2',
        'service.name': 'foo',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-bar',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'env-bar',
            name: 'bar',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 3 in the last 5 mins for service: bar, env: env-bar. Alert when > 2.',
        serviceName: 'bar',
        threshold: 2,
        triggerValue: 3,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/bar/errors?environment=env-bar',
      },
      id: 'bar_env-bar',
      payload: {
        'error.grouping_key': undefined,
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 3,
        'kibana.alert.reason':
          'Error count is 3 in the last 5 mins for service: bar, env: env-bar. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-bar',
        'service.name': 'bar',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
  });

  it('sends alert when service.environment field does not exist in the source', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerErrorCountRuleType(dependencies);

    const params = {
      threshold: 2,
      windowSize: 5,
      windowUnit: 'm',
      groupBy: ['service.name', 'service.environment'],
    };

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 2,
        },
      },
      aggregations: {
        error_counts: {
          buckets: [
            {
              key: ['foo', 'ENVIRONMENT_NOT_DEFINED'],
              doc_count: 5,
            },
            {
              key: ['foo', 'ENVIRONMENT_NOT_DEFINED'],
              doc_count: 4,
            },
            {
              key: ['bar', 'env-bar'],
              doc_count: 3,
            },
            {
              key: ['bar', 'env-bar-2'],
              doc_count: 1,
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

    await executor({ params });
    ['foo_ENVIRONMENT_NOT_DEFINED', 'foo_ENVIRONMENT_NOT_DEFINED', 'bar_env-bar'].forEach(
      (instanceName) =>
        expect(services.alertsClient.report).toHaveBeenCalledWith({
          actionGroup: 'threshold_met',
          id: instanceName,
        })
    );

    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(3);

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'Not defined',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'ENVIRONMENT_NOT_DEFINED',
            name: 'foo',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 5 in the last 5 mins for service: foo, env: Not defined. Alert when > 2.',
        serviceName: 'foo',
        threshold: 2,
        triggerValue: 5,
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=ENVIRONMENT_NOT_DEFINED',
      },
      id: 'foo_ENVIRONMENT_NOT_DEFINED',
      payload: {
        'error.grouping_key': undefined,
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 5,
        'kibana.alert.reason':
          'Error count is 5 in the last 5 mins for service: foo, env: Not defined. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'ENVIRONMENT_NOT_DEFINED',
        'service.name': 'foo',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'Not defined',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'ENVIRONMENT_NOT_DEFINED',
            name: 'foo',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 4 in the last 5 mins for service: foo, env: Not defined. Alert when > 2.',
        serviceName: 'foo',
        threshold: 2,
        triggerValue: 4,
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=ENVIRONMENT_NOT_DEFINED',
      },
      id: 'foo_ENVIRONMENT_NOT_DEFINED',
      payload: {
        'error.grouping_key': undefined,
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 4,
        'kibana.alert.reason':
          'Error count is 4 in the last 5 mins for service: foo, env: Not defined. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'ENVIRONMENT_NOT_DEFINED',
        'service.name': 'foo',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-bar',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'env-bar',
            name: 'bar',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 3 in the last 5 mins for service: bar, env: env-bar. Alert when > 2.',
        serviceName: 'bar',
        threshold: 2,
        triggerValue: 3,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/bar/errors?environment=env-bar',
      },
      id: 'bar_env-bar',
      payload: {
        'error.grouping_key': undefined,
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 3,
        'kibana.alert.reason':
          'Error count is 3 in the last 5 mins for service: bar, env: env-bar. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-bar',
        'service.name': 'bar',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
  });

  it('sends alert when rule is configured with group by on error.grouping_key and error.grouping_name', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerErrorCountRuleType(dependencies);

    const params = {
      threshold: 2,
      windowSize: 5,
      windowUnit: 'm',
      groupBy: ['service.name', 'service.environment', 'error.grouping_key', 'error.grouping_name'],
    };

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 2,
        },
      },
      aggregations: {
        error_counts: {
          buckets: [
            {
              key: ['foo', 'env-foo', 'error-key-foo', 'error-name-foo'],
              doc_count: 5,
            },
            {
              key: ['foo', 'env-foo-2', 'error-key-foo-2', 'error-name-foo2'],
              doc_count: 4,
            },
            {
              key: ['bar', 'env-bar', 'error-key-bar', 'error-name-bar'],
              doc_count: 3,
            },
            {
              key: ['bar', 'env-bar-2', 'error-key-bar-2', 'error-name-bar2'],
              doc_count: 1,
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

    await executor({ params });
    [
      'foo_env-foo_error-key-foo_error-name-foo',
      'foo_env-foo-2_error-key-foo-2_error-name-foo2',
      'bar_env-bar_error-key-bar_error-name-bar',
    ].forEach((instanceName) =>
      expect(services.alertsClient.report).toHaveBeenCalledWith({
        actionGroup: 'threshold_met',
        id: instanceName,
      })
    );

    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(3);

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo',
        errorGroupingKey: 'error-key-foo',
        errorGroupingName: 'error-name-foo',
        grouping: {
          service: {
            environment: 'env-foo',
            name: 'foo',
          },
          error: {
            grouping_key: 'error-key-foo',
            grouping_name: 'error-name-foo',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 5 in the last 5 mins for service: foo, env: env-foo, error key: error-key-foo, error name: error-name-foo. Alert when > 2.',
        serviceName: 'foo',
        threshold: 2,
        triggerValue: 5,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo',
      },
      id: 'foo_env-foo_error-key-foo_error-name-foo',
      payload: {
        'error.grouping_key': 'error-key-foo',
        'error.grouping_name': 'error-name-foo',
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 5,
        'kibana.alert.reason':
          'Error count is 5 in the last 5 mins for service: foo, env: env-foo, error key: error-key-foo, error name: error-name-foo. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-foo',
        'service.name': 'foo',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo-2',
        errorGroupingKey: 'error-key-foo-2',
        errorGroupingName: 'error-name-foo2',
        grouping: {
          service: {
            environment: 'env-foo-2',
            name: 'foo',
          },
          error: {
            grouping_key: 'error-key-foo-2',
            grouping_name: 'error-name-foo2',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 4 in the last 5 mins for service: foo, env: env-foo-2, error key: error-key-foo-2, error name: error-name-foo2. Alert when > 2.',
        serviceName: 'foo',
        threshold: 2,
        triggerValue: 4,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo-2',
      },
      id: 'foo_env-foo-2_error-key-foo-2_error-name-foo2',
      payload: {
        'error.grouping_key': 'error-key-foo-2',
        'error.grouping_name': 'error-name-foo2',
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 4,
        'kibana.alert.reason':
          'Error count is 4 in the last 5 mins for service: foo, env: env-foo-2, error key: error-key-foo-2, error name: error-name-foo2. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-foo-2',
        'service.name': 'foo',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-bar',
        errorGroupingKey: 'error-key-bar',
        errorGroupingName: 'error-name-bar',
        grouping: {
          service: {
            environment: 'env-bar',
            name: 'bar',
          },
          error: {
            grouping_key: 'error-key-bar',
            grouping_name: 'error-name-bar',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 3 in the last 5 mins for service: bar, env: env-bar, error key: error-key-bar, error name: error-name-bar. Alert when > 2.',
        serviceName: 'bar',
        threshold: 2,
        triggerValue: 3,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/bar/errors?environment=env-bar',
      },
      id: 'bar_env-bar_error-key-bar_error-name-bar',
      payload: {
        'error.grouping_key': 'error-key-bar',
        'error.grouping_name': 'error-name-bar',
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 3,
        'kibana.alert.reason':
          'Error count is 3 in the last 5 mins for service: bar, env: env-bar, error key: error-key-bar, error name: error-name-bar. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-bar',
        'service.name': 'bar',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
  });

  it('sends alert when rule is configured with a filter query', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerErrorCountRuleType(dependencies);

    const params = {
      threshold: 2,
      windowSize: 5,
      windowUnit: 'm',
      serviceName: undefined,
      searchConfiguration: {
        query: {
          query: 'service.name: foo and service.environment: env-foo',
          language: 'kuery',
        },
      },
      groupBy: ['service.name', 'service.environment'],
    };

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 2,
        },
      },
      aggregations: {
        error_counts: {
          buckets: [
            {
              key: ['foo', 'env-foo'],
              doc_count: 5,
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

    await executor({ params });
    ['foo_env-foo'].forEach((instanceName) =>
      expect(services.alertsClient.report).toHaveBeenCalledWith({
        actionGroup: 'threshold_met',
        id: instanceName,
      })
    );

    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(1);

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'env-foo',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'env-foo',
            name: 'foo',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 5 in the last 5 mins for service: foo, env: env-foo. Alert when > 2.',
        serviceName: 'foo',
        threshold: 2,
        triggerValue: 5,
        viewInAppUrl: 'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo',
      },
      id: 'foo_env-foo',
      payload: {
        'error.grouping_key': undefined,
        'kibana.alert.evaluation.threshold': 2,
        'kibana.alert.evaluation.value': 5,
        'kibana.alert.reason':
          'Error count is 5 in the last 5 mins for service: foo, env: env-foo. Alert when > 2.',
        'processor.event': 'error',
        'service.environment': 'env-foo',
        'service.name': 'foo',
        'kibana.alert.index_pattern': 'apm-*',
      },
    });
  });
  it('sends recovered alerts with their context', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerErrorCountRuleType(dependencies);

    const params = {
      threshold: 2,
      windowSize: 5,
      windowUnit: 'm',
    };

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
      hits: {
        hits: [],
        total: {
          relation: 'eq',
          value: 1,
        },
      },
      aggregations: {
        error_counts: {
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
          meta: [],
          state: [],
          context: {},
          id: 'synthtrace-high-cardinality-0_Synthtrace: many_errors',
          alertAsData: undefined,
        },
        hit: {
          'processor.event': 'error',
          'kibana.alert.evaluation.value': 60568922,
          'kibana.alert.evaluation.threshold': 24999998,
          'kibana.alert.reason':
            'Error count is 60568922 in the last 5 days for service: synthtrace-high-cardinality-0, env: Synthtrace: many_errors. Alert when > 24999998.',
          'agent.name': 'java',
          'service.environment': 'Synthtrace: many_errors',
          'service.name': 'synthtrace-high-cardinality-0',
          'kibana.alert.rule.category': 'Error count threshold',
          'kibana.alert.rule.consumer': 'alerts',
          'kibana.alert.rule.execution.uuid': '8ecb0754-1220-4b6b-b95d-87b3594e925a',
          'kibana.alert.rule.name': 'Error count threshold rule',
          'kibana.alert.rule.parameters': {
            groupBy: ['service.name', 'service.environment'],
          },
          'kibana.alert.rule.producer': 'apm',
          'kibana.alert.rule.revision': 8,
          'kibana.alert.rule.rule_type_id': 'apm.error_rate',
          'kibana.alert.rule.tags': [],
          'kibana.alert.rule.uuid': '63028cf5-c059-4a6b-b375-fd9007233223',
          'kibana.space_ids': [],
          '@timestamp': '2025-02-20T12:11:51.960Z',
          'event.action': 'active',
          'event.kind': 'signal',
          'kibana.alert.rule.execution.timestamp': '2025-02-20T12:11:51.960Z',
          'kibana.alert.action_group': 'threshold_met',
          'kibana.alert.flapping': true,
          'kibana.alert.flapping_history': [],
          'kibana.alert.instance.id': 'synthtrace-high-cardinality-0_Synthtrace: many_errors',
          'kibana.alert.maintenance_window_ids': [],
          'kibana.alert.consecutive_matches': 2,
          'kibana.alert.status': 'active',
          'kibana.alert.uuid': '81617b97-02d2-413a-9f64-77161de80df4',
          'kibana.alert.workflow_status': 'open',
          'kibana.alert.duration.us': 12012000,
          'kibana.alert.start': '2025-02-20T12:11:39.948Z',
          'kibana.alert.time_range': [],
          'kibana.version': '9.1.0',
          tags: [],
          'kibana.alert.previous_action_group': 'threshold_met',
        },
      },
    ]);

    await executor({ params });

    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(1);

    expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
      context: {
        alertDetailsUrl: 'http://localhost:5601/eyr/app/observability/alerts/test-uuid',
        environment: 'Synthtrace: many_errors',
        errorGroupingKey: undefined,
        grouping: {
          service: {
            environment: 'Synthtrace: many_errors',
            name: 'synthtrace-high-cardinality-0',
          },
        },
        interval: '5 mins',
        reason:
          'Error count is 60568922 in the last 5 days for service: synthtrace-high-cardinality-0, env: Synthtrace: many_errors. Alert when > 24999998.',
        serviceName: 'synthtrace-high-cardinality-0',
        threshold: 2,
        triggerValue: 60568922,
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/synthtrace-high-cardinality-0/errors?environment=Synthtrace%3A%20many_errors',
      },
      id: 'test-id',
    });
  });
});
