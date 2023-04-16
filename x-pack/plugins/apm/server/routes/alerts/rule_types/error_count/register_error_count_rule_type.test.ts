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
    expect(services.alertFactory.create).not.toBeCalled();
  });

  it('sends alerts with service name and environment for those that exceeded the threshold', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

    registerErrorCountRuleType(dependencies);

    const params = { threshold: 2, windowSize: 5, windowUnit: 'm' };

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

    await executor({ params });
    [
      'apm.error_rate_foo_env-foo',
      'apm.error_rate_foo_env-foo-2',
      'apm.error_rate_bar_env-bar',
    ].forEach((instanceName) =>
      expect(services.alertFactory.create).toHaveBeenCalledWith(instanceName)
    );

    expect(scheduleActions).toHaveBeenCalledTimes(3);

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      environment: 'env-foo',
      threshold: 2,
      triggerValue: 5,
      reason: 'Error count is 5 in the last 5 mins for foo. Alert when > 2.',
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      environment: 'env-foo-2',
      threshold: 2,
      triggerValue: 4,
      reason: 'Error count is 4 in the last 5 mins for foo. Alert when > 2.',
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo-2',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'bar',
      environment: 'env-bar',
      reason: 'Error count is 3 in the last 5 mins for bar. Alert when > 2.',
      threshold: 2,
      triggerValue: 3,
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/bar/errors?environment=env-bar',
    });
  });

  it('sends alert when rule is configured with group by on transaction.name', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

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

    await executor({ params });
    [
      'foo_env-foo_tx-name-foo',
      'foo_env-foo-2_tx-name-foo-2',
      'bar_env-bar_tx-name-bar',
    ].forEach((instanceName) =>
      expect(services.alertFactory.create).toHaveBeenCalledWith(instanceName)
    );

    expect(scheduleActions).toHaveBeenCalledTimes(3);

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      environment: 'env-foo',
      threshold: 2,
      triggerValue: 5,
      reason:
        'Error count is 5 in the last 5 mins for foo, env-foo, tx-name-foo. Alert when > 2.',
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo',
      transactionName: 'tx-name-foo',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      environment: 'env-foo-2',
      threshold: 2,
      triggerValue: 4,
      reason:
        'Error count is 4 in the last 5 mins for foo, env-foo-2, tx-name-foo-2. Alert when > 2.',
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo-2',
      transactionName: 'tx-name-foo-2',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'bar',
      environment: 'env-bar',
      reason:
        'Error count is 3 in the last 5 mins for bar, env-bar, tx-name-bar. Alert when > 2.',
      threshold: 2,
      triggerValue: 3,
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/bar/errors?environment=env-bar',
      transactionName: 'tx-name-bar',
    });
  });

  it('sends alert when rule is configured with preselected group by', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

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

    await executor({ params });
    ['foo_env-foo', 'foo_env-foo-2', 'bar_env-bar'].forEach((instanceName) =>
      expect(services.alertFactory.create).toHaveBeenCalledWith(instanceName)
    );

    expect(scheduleActions).toHaveBeenCalledTimes(3);

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      environment: 'env-foo',
      threshold: 2,
      triggerValue: 5,
      reason:
        'Error count is 5 in the last 5 mins for foo, env-foo. Alert when > 2.',
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      environment: 'env-foo-2',
      threshold: 2,
      triggerValue: 4,
      reason:
        'Error count is 4 in the last 5 mins for foo, env-foo-2. Alert when > 2.',
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo-2',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'bar',
      environment: 'env-bar',
      reason:
        'Error count is 3 in the last 5 mins for bar, env-bar. Alert when > 2.',
      threshold: 2,
      triggerValue: 3,
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/bar/errors?environment=env-bar',
    });
  });

  it('sends alert when rule is configured with group by field that does not exist in the source', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

    registerErrorCountRuleType(dependencies);

    const params = { threshold: 2, windowSize: 5, windowUnit: 'm' };

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

    await executor({ params });
    [
      'foo_ENVIRONMENT_NOT_DEFINED',
      'foo_ENVIRONMENT_NOT_DEFINED',
      'bar_env-bar',
    ].forEach((instanceName) =>
      expect(services.alertFactory.create).toHaveBeenCalledWith(instanceName)
    );

    expect(scheduleActions).toHaveBeenCalledTimes(3);

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      environment: 'ENVIRONMENT_NOT_DEFINED',
      threshold: 2,
      triggerValue: 5,
      reason: 'Error count is 5 in the last 5 mins for foo. Alert when > 2.',
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      environment: 'ENVIRONMENT_NOT_DEFINED',
      threshold: 2,
      triggerValue: 4,
      reason: 'Error count is 4 in the last 5 mins for foo. Alert when > 2.',
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/foo/errors?environment=env-foo-2',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'bar',
      environment: 'env-bar',
      reason:
        'Error count is 3 in the last 5 mins for bar, env-bar. Alert when > 2.',
      threshold: 2,
      triggerValue: 3,
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/bar/errors?environment=env-bar',
    });
  });
});
