/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTransactionDurationAlertType } from './register_transaction_duration_alert_type';
import { createRuleTypeMocks } from './test_utils';

describe('registerTransactionDurationAlertType', () => {
  it('sends alert when value is greater than threashold', async () => {
    const { services, dependencies, executor, scheduleActions } =
      createRuleTypeMocks();

    registerTransactionDurationAlertType(dependencies);

    services.scopedClusterClient.asCurrentUser.search.mockResponse({
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
      transactionType: 'request',
      serviceName: 'opbeans-java',
      environment: 'Not defined',
      threshold: 3000000,
      triggerValue: '5,500 ms',
      interval: `5m`,
      reason:
        'Avg. latency is 5,500 ms in the last 5 mins for opbeans-java. Alert when > 3,000 ms.',
      viewInAppUrl:
        'http://localhost:5601/eyr/app/apm/services/opbeans-java?transactionType=request&environment=ENVIRONMENT_ALL',
    });
  });
});
