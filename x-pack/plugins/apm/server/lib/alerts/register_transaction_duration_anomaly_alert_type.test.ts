/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import * as Rx from 'rxjs';
import { toArray, map } from 'rxjs/operators';
import { registerTransactionDurationAnomalyAlertType } from './register_transaction_duration_anomaly_alert_type';
import { APMConfig } from '../..';
import { ANOMALY_SEVERITY } from '../../../../ml/common';
import { Job, MlPluginSetup } from '../../../../ml/server';
import * as GetServiceAnomalies from '../service_map/get_service_anomalies';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
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

describe('Transaction duration anomaly alert', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe("doesn't send alert", () => {
    it('ml is not defined', async () => {
      let alertExecutor: any;
      const registry = {
        registerType: ({ executor }) => {
          alertExecutor = executor;
        },
      } as APMRuleRegistry;

      registerTransactionDurationAnomalyAlertType({
        registry,
        ml: undefined,
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
      const params = { anomalySeverityType: ANOMALY_SEVERITY.MINOR };

      await alertExecutor!({ services, params, startedAt: new Date() });
      expect(
        services.scopedClusterClient.asCurrentUser.search
      ).not.toHaveBeenCalled();
      expect(services.alertInstanceFactory).not.toHaveBeenCalled();
    });

    it('ml jobs are not available', async () => {
      jest
        .spyOn(GetServiceAnomalies, 'getMLJobs')
        .mockReturnValue(Promise.resolve([]));

      let alertExecutor: any;
      const registry = {
        registerType: ({ executor }) => {
          alertExecutor = executor;
        },
      } as APMRuleRegistry;

      const scheduleActions = jest.fn();

      const services = {
        scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
        scopedRuleRegistryClient: {
          bulkIndex: jest.fn(),
        },
        alertInstanceFactory: jest.fn(() => ({ scheduleActions })),
        alertWithLifecycle: jest.fn(),
      };

      const ml = ({
        mlSystemProvider: () => ({ mlAnomalySearch: jest.fn() }),
        anomalyDetectorsProvider: jest.fn(),
      } as unknown) as MlPluginSetup;

      registerTransactionDurationAnomalyAlertType({
        registry,
        ml,
        config$: mockedConfig$,
        logger: {} as any,
      });

      expect(alertExecutor).toBeDefined();

      const params = { anomalySeverityType: ANOMALY_SEVERITY.MINOR };

      await alertExecutor!({ services, params, startedAt: new Date() });
      expect(
        services.scopedClusterClient.asCurrentUser.search
      ).not.toHaveBeenCalled();
      expect(services.alertInstanceFactory).not.toHaveBeenCalled();
    });

    it('anomaly is less than threshold', async () => {
      jest.spyOn(GetServiceAnomalies, 'getMLJobs').mockReturnValue(
        Promise.resolve(([
          {
            job_id: '1',
            custom_settings: { job_tags: { environment: 'development' } },
          },
          {
            job_id: '2',
            custom_settings: { job_tags: { environment: 'production' } },
          },
        ] as unknown) as Job[])
      );

      let alertExecutor: any;
      const registry = {
        registerType: ({ executor }) => {
          alertExecutor = executor;
        },
      } as APMRuleRegistry;

      const ml = ({
        mlSystemProvider: () => ({
          mlAnomalySearch: () => ({
            aggregations: {
              anomaly_groups: {
                buckets: [
                  {
                    doc_count: 1,
                    latest_score: {
                      top: [{ metrics: { record_score: 0, job_id: '1' } }],
                    },
                  },
                ],
              },
            },
          }),
        }),
        anomalyDetectorsProvider: jest.fn(),
      } as unknown) as MlPluginSetup;

      registerTransactionDurationAnomalyAlertType({
        registry,
        ml,
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

      registerTransactionDurationAnomalyAlertType({
        registry,
        ml,
        config$: mockedConfig$,
        logger: {} as any,
      });
      expect(alertExecutor).toBeDefined();

      const params = { anomalySeverityType: ANOMALY_SEVERITY.MINOR };

      await alertExecutor!({ services, params, startedAt: new Date() });
      expect(
        services.scopedClusterClient.asCurrentUser.search
      ).not.toHaveBeenCalled();
      expect(services.alertInstanceFactory).not.toHaveBeenCalled();
    });
  });

  describe('sends alert', () => {
    it('for all services that exceeded the threshold', async () => {
      jest.spyOn(GetServiceAnomalies, 'getMLJobs').mockReturnValue(
        Promise.resolve(([
          {
            job_id: '1',
            custom_settings: { job_tags: { environment: 'development' } },
          },
          {
            job_id: '2',
            custom_settings: { job_tags: { environment: 'production' } },
          },
        ] as unknown) as Job[])
      );

      let alertExecutor: any;

      const registry = {
        registerType: ({ executor }) => {
          alertExecutor = executor;
        },
      } as APMRuleRegistry;

      const ml = ({
        mlSystemProvider: () => ({
          mlAnomalySearch: () => ({
            aggregations: {
              anomaly_groups: {
                buckets: [
                  {
                    latest_score: {
                      top: [
                        {
                          metrics: {
                            record_score: 80,
                            job_id: '1',
                            partition_field_value: 'foo',
                            by_field_value: 'type-foo',
                          },
                        },
                      ],
                    },
                  },
                  {
                    latest_score: {
                      top: [
                        {
                          metrics: {
                            record_score: 20,
                            job_id: '2',
                            parttition_field_value: 'bar',
                            by_field_value: 'type-bar',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          }),
        }),
        anomalyDetectorsProvider: jest.fn(),
      } as unknown) as MlPluginSetup;

      registerTransactionDurationAnomalyAlertType({
        registry,
        ml,
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

      const params = { anomalySeverityType: ANOMALY_SEVERITY.MINOR };

      await alertExecutor!({ services, params, startedAt: new Date() });

      expect(services.alertInstanceFactory).toHaveBeenCalledTimes(1);

      expect(services.alertInstanceFactory).toHaveBeenCalledWith(
        'apm.transaction_duration_anomaly_foo_development_type-foo'
      );

      expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
        serviceName: 'foo',
        transactionType: 'type-foo',
        environment: 'development',
        threshold: 'minor',
        triggerValue: 'critical',
      });
    });
  });
});
