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

import { registerErrorCountAlertType } from './register_error_count_alert_type';

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

describe('Error count alert', () => {
  it("doesn't send an alert when error count is less than threshold", async () => {
    let alertExecutor: any;
    const alerts = {
      registerType: ({ executor }) => {
        alertExecutor = executor;
      },
    } as AlertingPlugin['setup'];

    registerErrorCountAlertType({
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

  it('sends alerts with service name and environment', async () => {
    let alertExecutor: any;
    const alerts = {
      registerType: ({ executor }) => {
        alertExecutor = executor;
      },
    } as AlertingPlugin['setup'];

    registerErrorCountAlertType({
      alerts,
      config$: mockedConfig$,
    });
    expect(alertExecutor).toBeDefined();

    const scheduleActions = jest.fn();
    const services = {
      callCluster: jest.fn(() => ({
        hits: {
          total: {
            value: 2,
          },
        },
        aggregations: {
          services: {
            buckets: [
              {
                key: 'foo',
                environments: {
                  buckets: [{ key: 'env-foo' }, { key: 'env-foo-2' }],
                },
              },
              {
                key: 'bar',
                environments: {
                  buckets: [{ key: 'env-bar' }, { key: 'env-bar-2' }],
                },
              },
            ],
          },
        },
      })),
      alertInstanceFactory: jest.fn(() => ({ scheduleActions })),
    };
    const params = { threshold: 1, windowSize: 5, windowUnit: 'm' };

    await alertExecutor!({ services, params });
    [
      'apm.error_rate_foo_env-foo',
      'apm.error_rate_foo_env-foo-2',
      'apm.error_rate_bar_env-bar',
      'apm.error_rate_bar_env-bar-2',
    ].forEach((instanceName) =>
      expect(services.alertInstanceFactory).toHaveBeenCalledWith(instanceName)
    );

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      environment: 'env-foo',
      threshold: 1,
      triggerValue: 2,
      interval: '5m',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      environment: 'env-foo-2',
      threshold: 1,
      triggerValue: 2,
      interval: '5m',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'bar',
      environment: 'env-bar',
      threshold: 1,
      triggerValue: 2,
      interval: '5m',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'bar',
      environment: 'env-bar-2',
      threshold: 1,
      triggerValue: 2,
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

    registerErrorCountAlertType({
      alerts,
      config$: mockedConfig$,
    });
    expect(alertExecutor).toBeDefined();

    const scheduleActions = jest.fn();
    const services = {
      callCluster: jest.fn(() => ({
        hits: {
          total: {
            value: 2,
          },
        },
        aggregations: {
          services: {
            buckets: [
              {
                key: 'foo',
              },
              {
                key: 'bar',
              },
            ],
          },
        },
      })),
      alertInstanceFactory: jest.fn(() => ({ scheduleActions })),
    };
    const params = { threshold: 1, windowSize: 5, windowUnit: 'm' };

    await alertExecutor!({ services, params });
    ['apm.error_rate_foo', 'apm.error_rate_bar'].forEach((instanceName) =>
      expect(services.alertInstanceFactory).toHaveBeenCalledWith(instanceName)
    );

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      environment: undefined,
      threshold: 1,
      triggerValue: 2,
      interval: '5m',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'bar',
      environment: undefined,
      threshold: 1,
      triggerValue: 2,
      interval: '5m',
    });
  });
});
