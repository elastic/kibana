/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import * as Rx from 'rxjs';
import { toArray, map } from 'rxjs/operators';
import { AlertingPlugin } from '../../../../alerts/server';
import { APMConfig } from '../..';
import { registerTransactionErrorRateAlertType } from './register_transaction_error_rate_alert_type';

type Operator<T1, T2> = (source: Rx.Observable<T1>) => Rx.Observable<T2>;
const pipeClosure = <T1, T2>(fn: Operator<T1, T2>): Operator<T1, T2> => {
  return (source: Rx.Observable<T1>) => {
    return Rx.defer(() => fn(source));
  };
};
const mockedConfig$ = (Rx.of('apm_oss.errorIndices').pipe(
  pipeClosure((source$) => {
    return source$.pipe(map((i) => i));
  }),
  toArray()
) as unknown) as Observable<APMConfig>;

describe('Transaction error rate alert', () => {
  it("doesn't send an alert when rate is less than threshold", async () => {
    let alertExecutor: any;
    const alerts = {
      registerType: ({ executor }) => {
        alertExecutor = executor;
      },
    } as AlertingPlugin['setup'];

    registerTransactionErrorRateAlertType({
      alerts,
      config$: mockedConfig$,
    });
    expect(alertExecutor).toBeDefined();

    const services = {
      callCluster: jest.fn(() => ({
        hits: {
          total: {
            value: 0,
          },
        },
      })),
      alertInstanceFactory: jest.fn(),
    };
    const params = { threshold: 1 };

    await alertExecutor!({ services, params });
    expect(services.alertInstanceFactory).not.toBeCalled();
  });

  it('sends alerts with service name, transaction type and environment', async () => {
    let alertExecutor: any;
    const alerts = {
      registerType: ({ executor }) => {
        alertExecutor = executor;
      },
    } as AlertingPlugin['setup'];

    registerTransactionErrorRateAlertType({
      alerts,
      config$: mockedConfig$,
    });
    expect(alertExecutor).toBeDefined();

    const scheduleActions = jest.fn();
    const services = {
      callCluster: jest.fn(() => ({
        hits: {
          total: {
            value: 4,
          },
        },
        aggregations: {
          erroneous_transactions: {
            doc_count: 2,
          },
          services: {
            buckets: [
              {
                key: 'foo',
                transaction_types: {
                  buckets: [
                    {
                      key: 'type-foo',
                      environments: {
                        buckets: [{ key: 'env-foo' }, { key: 'env-foo-2' }],
                      },
                    },
                  ],
                },
              },
              {
                key: 'bar',
                transaction_types: {
                  buckets: [
                    {
                      key: 'type-bar',
                      environments: {
                        buckets: [{ key: 'env-bar' }, { key: 'env-bar-2' }],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      })),
      alertInstanceFactory: jest.fn(() => ({ scheduleActions })),
    };
    const params = { threshold: 10, windowSize: 5, windowUnit: 'm' };

    await alertExecutor!({ services, params });
    [
      'apm.transaction_error_rate_foo_type-foo_env-foo',
      'apm.transaction_error_rate_foo_type-foo_env-foo-2',
      'apm.transaction_error_rate_bar_type-bar_env-bar',
      'apm.transaction_error_rate_bar_type-bar_env-bar-2',
    ].forEach((instanceName) =>
      expect(services.alertInstanceFactory).toHaveBeenCalledWith(instanceName)
    );

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      transactionType: 'type-foo',
      environment: 'env-foo',
      threshold: 10,
      triggerValue: '50',
      interval: '5m',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      transactionType: 'type-foo',
      environment: 'env-foo-2',
      threshold: 10,
      triggerValue: '50',
      interval: '5m',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'bar',
      transactionType: 'type-bar',
      environment: 'env-bar',
      threshold: 10,
      triggerValue: '50',
      interval: '5m',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'bar',
      transactionType: 'type-bar',
      environment: 'env-bar-2',
      threshold: 10,
      triggerValue: '50',
      interval: '5m',
    });
  });
  it('sends alerts with service name and transaction type', async () => {
    let alertExecutor: any;
    const alerts = {
      registerType: ({ executor }) => {
        alertExecutor = executor;
      },
    } as AlertingPlugin['setup'];

    registerTransactionErrorRateAlertType({
      alerts,
      config$: mockedConfig$,
    });
    expect(alertExecutor).toBeDefined();

    const scheduleActions = jest.fn();
    const services = {
      callCluster: jest.fn(() => ({
        hits: {
          total: {
            value: 4,
          },
        },
        aggregations: {
          erroneous_transactions: {
            doc_count: 2,
          },
          services: {
            buckets: [
              {
                key: 'foo',
                transaction_types: {
                  buckets: [{ key: 'type-foo' }],
                },
              },
              {
                key: 'bar',
                transaction_types: {
                  buckets: [{ key: 'type-bar' }],
                },
              },
            ],
          },
        },
      })),
      alertInstanceFactory: jest.fn(() => ({ scheduleActions })),
    };
    const params = { threshold: 10, windowSize: 5, windowUnit: 'm' };

    await alertExecutor!({ services, params });
    [
      'apm.transaction_error_rate_foo_type-foo',
      'apm.transaction_error_rate_bar_type-bar',
    ].forEach((instanceName) =>
      expect(services.alertInstanceFactory).toHaveBeenCalledWith(instanceName)
    );

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      transactionType: 'type-foo',
      environment: undefined,
      threshold: 10,
      triggerValue: '50',
      interval: '5m',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'bar',
      transactionType: 'type-bar',
      environment: undefined,
      threshold: 10,
      triggerValue: '50',
      interval: '5m',
    });
  });

  it('sends alerts with service name', async () => {
    let alertExecutor: any;
    const alerts = {
      registerType: ({ executor }) => {
        alertExecutor = executor;
      },
    } as AlertingPlugin['setup'];

    registerTransactionErrorRateAlertType({
      alerts,
      config$: mockedConfig$,
    });
    expect(alertExecutor).toBeDefined();

    const scheduleActions = jest.fn();
    const services = {
      callCluster: jest.fn(() => ({
        hits: {
          total: {
            value: 4,
          },
        },
        aggregations: {
          erroneous_transactions: {
            doc_count: 2,
          },
          services: {
            buckets: [{ key: 'foo' }, { key: 'bar' }],
          },
        },
      })),
      alertInstanceFactory: jest.fn(() => ({ scheduleActions })),
    };
    const params = { threshold: 10, windowSize: 5, windowUnit: 'm' };

    await alertExecutor!({ services, params });
    [
      'apm.transaction_error_rate_foo',
      'apm.transaction_error_rate_bar',
    ].forEach((instanceName) =>
      expect(services.alertInstanceFactory).toHaveBeenCalledWith(instanceName)
    );

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      transactionType: undefined,
      environment: undefined,
      threshold: 10,
      triggerValue: '50',
      interval: '5m',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'bar',
      transactionType: undefined,
      environment: undefined,
      threshold: 10,
      triggerValue: '50',
      interval: '5m',
    });
  });
});
