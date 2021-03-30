/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import * as Rx from 'rxjs';
import { toArray, map } from 'rxjs/operators';
import { APMConfig } from '../..';

import { registerErrorCountAlertType } from './register_error_count_alert_type';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { APMRuleRegistry } from '../../plugin';

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
    const registry = {
      registerType: ({ executor }) => {
        alertExecutor = executor;
      },
    } as APMRuleRegistry;

    registerErrorCountAlertType({
      registry,
      config$: mockedConfig$,
      logger: {} as any,
    });
    expect(alertExecutor).toBeDefined();

    const services = {
      scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
      scopedRuleRegistryClient: {
        bulkIndex: jest.fn(),
      },
      alertInstanceFactory: jest.fn(),
      alertWithLifecycle: jest.fn(),
    };

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
        _shards: {
          failed: 0,
          skipped: 0,
          successful: 1,
          total: 1,
        },
      })
    );

    await alertExecutor!({ services, params, startedAt: new Date() });
    expect(services.alertInstanceFactory).not.toBeCalled();
  });

  it('sends alerts with service name and environment for those that exceeded the threshold', async () => {
    let alertExecutor: any;
    const registry = {
      registerType: ({ executor }) => {
        alertExecutor = executor;
      },
    } as APMRuleRegistry;

    registerErrorCountAlertType({
      registry,
      config$: mockedConfig$,
      logger: {} as any,
    });
    expect(alertExecutor).toBeDefined();

    const scheduleActions = jest.fn();

    const services = {
      scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
      scopedRuleRegistryClient: {
        bulkIndex: jest.fn(),
      },
      alertInstanceFactory: jest.fn(() => ({ scheduleActions })),
      alertWithLifecycle: jest.fn(),
    };

    const params = { threshold: 2, windowSize: 5, windowUnit: 'm' };

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
      })
    );

    await alertExecutor!({ services, params, startedAt: new Date() });
    [
      'apm.error_rate_foo_env-foo',
      'apm.error_rate_foo_env-foo-2',
      'apm.error_rate_bar_env-bar',
    ].forEach((instanceName) =>
      expect(services.alertInstanceFactory).toHaveBeenCalledWith(instanceName)
    );

    expect(scheduleActions).toHaveBeenCalledTimes(3);

    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      environment: 'env-foo',
      threshold: 2,
      triggerValue: 5,
      interval: '5m',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'foo',
      environment: 'env-foo-2',
      threshold: 2,
      triggerValue: 4,
      interval: '5m',
    });
    expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
      serviceName: 'bar',
      environment: 'env-bar',
      threshold: 2,
      triggerValue: 3,
      interval: '5m',
    });
  });
});
