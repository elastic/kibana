/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTransactionErrorRateAlertType } from './register_transaction_error_rate_alert_type';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { createRuleTypeMocks } from './test_utils';

describe('Transaction error rate alert', () => {
  it("doesn't send an alert when rate is less than threshold", async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    registerTransactionErrorRateAlertType({
      ...dependencies,
    });

    const params = { threshold: 1 };

    services.scopedClusterClient.asCurrentUser.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
      })
    );

    await executor({ params });
    expect(services.alertInstanceFactory).not.toBeCalled();
  });

  it('sends alerts for services that exceeded the threshold', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

    registerTransactionErrorRateAlertType({
      ...dependencies,
    });

    services.scopedClusterClient.asCurrentUser.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
      })
    );

    const params = { threshold: 10, windowSize: 5, windowUnit: 'm' };

    await executor({ params });

    expect(services.alertInstanceFactory).toHaveBeenCalledTimes(1);

    expect(services.alertInstanceFactory).toHaveBeenCalledWith(
      'apm.transaction_error_rate_foo_type-foo_env-foo'
    );
    expect(services.alertInstanceFactory).not.toHaveBeenCalledWith(
      'apm.transaction_error_rate_bar_type-bar_env-bar'
    );

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      transactionType: 'type-foo',
      environment: 'env-foo',
      threshold: 10,
      triggerValue: '10',
      interval: '5m',
    });
  });
});
