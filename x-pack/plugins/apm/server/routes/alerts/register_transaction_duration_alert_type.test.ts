/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTransactionDurationAlertType } from './register_transaction_duration_alert_type';
import { createRuleTypeMocks } from './test_utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

describe('registerTransactionDurationAlertType', () => {
  it('sends alert when value is greater than threashold', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

    registerTransactionDurationAlertType(dependencies);

    services.scopedClusterClient.asCurrentUser.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          hits: [],
          total: {
            relation: 'eq',
            value: 2,
          },
        },
        aggregations: {
          latency: {
            value: 5500000,
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

    const params = {
      threshold: 3000,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: 'request',
      serviceName: 'opbeans-java',
    };
    await executor({ params });
    expect(scheduleActions).toHaveBeenCalledTimes(1);
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      transactionType: 'request',
      serviceName: 'opbeans-java',
      environment: 'Not defined',
      threshold: 3000000,
      triggerValue: '5,500 ms',
      interval: `5m`,
    });
  });
});
