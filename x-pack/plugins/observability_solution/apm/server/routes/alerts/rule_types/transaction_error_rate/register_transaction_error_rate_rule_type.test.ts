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
    expect(services.alertFactory.create).not.toBeCalled();
  });

  it('sends alerts for services that exceeded the threshold', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

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
                  getOutcomeBucket('success', 90),
                  getOutcomeBucket('failure', 10),
                ],
              },
            },
            {
              key: ['bar', 'env-bar', 'type-bar'],
              outcomes: {
                buckets: [
                  getOutcomeBucket('success', 90),
                  getOutcomeBucket('failure', 1),
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
    };

    await executor({ params });

    expect(services.alertFactory.create).toHaveBeenCalledTimes(1);

    expect(services.alertFactory.create).toHaveBeenCalledWith(
      'foo_env-foo_type-foo'
    );
    expect(services.alertFactory.create).not.toHaveBeenCalledWith(
      'bar_env-bar_type-bar'
    );

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      transactionType: 'type-foo',
      environment: 'env-foo',
      reason:
        'Failed transactions is 10% in the last 5 mins for service: foo, env: env-foo, type: type-foo. Alert when > 10%.',
      threshold: 10,
      triggerValue: '10',
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/foo?transactionType=type-foo&environment=env-foo',
      alertDetailsUrl: 'mockedAlertsLocator > getLocation',
    });
  });

  it('sends alert when rule is configured with group by on transaction.name', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

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
                  getOutcomeBucket('success', 90),
                  getOutcomeBucket('failure', 10),
                ],
              },
            },
            {
              key: ['bar', 'env-bar', 'type-bar', 'tx-name-bar'],
              outcomes: {
                buckets: [
                  getOutcomeBucket('success', 90),
                  getOutcomeBucket('failure', 1),
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
      groupBy: [
        'service.name',
        'service.environment',
        'transaction.type',
        'transaction.name',
      ],
    };

    await executor({ params });

    expect(services.alertFactory.create).toHaveBeenCalledTimes(1);

    expect(services.alertFactory.create).toHaveBeenCalledWith(
      'foo_env-foo_type-foo_tx-name-foo'
    );
    expect(services.alertFactory.create).not.toHaveBeenCalledWith(
      'bar_env-bar_type-bar_tx-name-bar'
    );

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      transactionType: 'type-foo',
      environment: 'env-foo',
      reason:
        'Failed transactions is 10% in the last 5 mins for service: foo, env: env-foo, type: type-foo, name: tx-name-foo. Alert when > 10%.',
      threshold: 10,
      triggerValue: '10',
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/foo?transactionType=type-foo&environment=env-foo',
      transactionName: 'tx-name-foo',
      alertDetailsUrl: 'mockedAlertsLocator > getLocation',
    });
  });

  it('sends alert when rule is configured with preselected group by', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

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
                  getOutcomeBucket('success', 90),
                  getOutcomeBucket('failure', 10),
                ],
              },
            },
            {
              key: ['bar', 'env-bar', 'type-bar'],
              outcomes: {
                buckets: [
                  getOutcomeBucket('success', 90),
                  getOutcomeBucket('failure', 1),
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

    await executor({ params });

    expect(services.alertFactory.create).toHaveBeenCalledTimes(1);

    expect(services.alertFactory.create).toHaveBeenCalledWith(
      'foo_env-foo_type-foo'
    );
    expect(services.alertFactory.create).not.toHaveBeenCalledWith(
      'bar_env-bar_type-bar'
    );

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      transactionType: 'type-foo',
      environment: 'env-foo',
      reason:
        'Failed transactions is 10% in the last 5 mins for service: foo, env: env-foo, type: type-foo. Alert when > 10%.',
      threshold: 10,
      triggerValue: '10',
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/foo?transactionType=type-foo&environment=env-foo',
      alertDetailsUrl: 'mockedAlertsLocator > getLocation',
    });
  });

  it('sends alert when service.environment field does not exist in the source', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

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
                  getOutcomeBucket('success', 90),
                  getOutcomeBucket('failure', 10),
                ],
              },
            },
            {
              key: ['bar', 'ENVIRONMENT_NOT_DEFINED', 'type-bar'],
              outcomes: {
                buckets: [
                  getOutcomeBucket('success', 90),
                  getOutcomeBucket('failure', 1),
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

    await executor({ params });

    expect(services.alertFactory.create).toHaveBeenCalledTimes(1);

    expect(services.alertFactory.create).toHaveBeenCalledWith(
      'foo_ENVIRONMENT_NOT_DEFINED_type-foo'
    );
    expect(services.alertFactory.create).not.toHaveBeenCalledWith(
      'bar_ENVIRONMENT_NOT_DEFINED_type-bar'
    );

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      transactionType: 'type-foo',
      environment: 'Not defined',
      reason:
        'Failed transactions is 10% in the last 5 mins for service: foo, env: Not defined, type: type-foo. Alert when > 10%.',
      threshold: 10,
      triggerValue: '10',
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/foo?transactionType=type-foo&environment=ENVIRONMENT_ALL',
      alertDetailsUrl: 'mockedAlertsLocator > getLocation',
    });
  });

  it('sends alert when rule is configured with a filter query', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

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
                  getOutcomeBucket('success', 90),
                  getOutcomeBucket('failure', 10),
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

    expect(services.alertFactory.create).toHaveBeenCalledTimes(1);

    expect(services.alertFactory.create).toHaveBeenCalledWith(
      'bar_env-bar_type-bar'
    );

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'bar',
      transactionType: 'type-bar',
      environment: 'env-bar',
      reason:
        'Failed transactions is 10% in the last 5 mins for service: bar, env: env-bar, type: type-bar. Alert when > 10%.',
      threshold: 10,
      triggerValue: '10',
      interval: '5 mins',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/bar?transactionType=type-bar&environment=env-bar',
      alertDetailsUrl: 'mockedAlertsLocator > getLocation',
    });
  });
});

function getOutcomeBucket(outcome: 'success' | 'failure', docCount: number) {
  return {
    key: outcome,
    doc_count: docCount,
    'container.id': { doc_count_error_upper_bound: 0, buckets: [] },
    'host.name': { doc_count_error_upper_bound: 0, buckets: [] },
  };
}
