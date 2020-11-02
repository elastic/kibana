/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import * as Rx from 'rxjs';
import { toArray, map } from 'rxjs/operators';
import { AlertingPlugin } from '../../../../alerts/server';
import { registerTransactionDurationAnomalyAlertType } from './register_transaction_duration_anomaly_alert_type';
import { APMConfig } from '../..';
import { ANOMALY_SEVERITY } from '../../../../ml/common';
import { Job, MlPluginSetup } from '../../../../ml/server';
import * as GetServiceAnomalies from '../service_map/get_service_anomalies';

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
      const alerts = {
        registerType: ({ executor }) => {
          alertExecutor = executor;
        },
      } as AlertingPlugin['setup'];

      registerTransactionDurationAnomalyAlertType({
        alerts,
        ml: undefined,
        config$: mockedConfig$,
      });
      expect(alertExecutor).toBeDefined();

      const services = {
        callCluster: jest.fn(),
        alertInstanceFactory: jest.fn(),
      };
      const params = { anomalySeverityType: ANOMALY_SEVERITY.MINOR };

      await alertExecutor!({ services, params });
      expect(services.callCluster).not.toHaveBeenCalled();
      expect(services.alertInstanceFactory).not.toHaveBeenCalled();
    });

    it('ml jobs are not available', async () => {
      jest
        .spyOn(GetServiceAnomalies, 'getMLJobs')
        .mockReturnValue(Promise.resolve([]));

      let alertExecutor: any;

      const alerts = {
        registerType: ({ executor }) => {
          alertExecutor = executor;
        },
      } as AlertingPlugin['setup'];

      const ml = ({
        mlSystemProvider: () => ({ mlAnomalySearch: jest.fn() }),
        anomalyDetectorsProvider: jest.fn(),
      } as unknown) as MlPluginSetup;

      registerTransactionDurationAnomalyAlertType({
        alerts,
        ml,
        config$: mockedConfig$,
      });
      expect(alertExecutor).toBeDefined();

      const services = {
        callCluster: jest.fn(),
        alertInstanceFactory: jest.fn(),
      };
      const params = { anomalySeverityType: ANOMALY_SEVERITY.MINOR };

      await alertExecutor!({ services, params });
      expect(services.callCluster).not.toHaveBeenCalled();
      expect(services.alertInstanceFactory).not.toHaveBeenCalled();
    });

    it('anomaly is less than threshold', async () => {
      jest
        .spyOn(GetServiceAnomalies, 'getMLJobs')
        .mockReturnValue(
          Promise.resolve([{ job_id: '1' }, { job_id: '2' }] as Job[])
        );

      let alertExecutor: any;

      const alerts = {
        registerType: ({ executor }) => {
          alertExecutor = executor;
        },
      } as AlertingPlugin['setup'];

      const ml = ({
        mlSystemProvider: () => ({
          mlAnomalySearch: () => ({
            hits: { total: { value: 0 } },
          }),
        }),
        anomalyDetectorsProvider: jest.fn(),
      } as unknown) as MlPluginSetup;

      registerTransactionDurationAnomalyAlertType({
        alerts,
        ml,
        config$: mockedConfig$,
      });
      expect(alertExecutor).toBeDefined();

      const services = {
        callCluster: jest.fn(),
        alertInstanceFactory: jest.fn(),
      };
      const params = { anomalySeverityType: ANOMALY_SEVERITY.MINOR };

      await alertExecutor!({ services, params });
      expect(services.callCluster).not.toHaveBeenCalled();
      expect(services.alertInstanceFactory).not.toHaveBeenCalled();
    });
  });

  describe('sends alert', () => {
    it('with service name, environment and transaction type', async () => {
      jest.spyOn(GetServiceAnomalies, 'getMLJobs').mockReturnValue(
        Promise.resolve([
          {
            job_id: '1',
            custom_settings: {
              job_tags: {
                environment: 'production',
              },
            },
          } as unknown,
          {
            job_id: '2',
            custom_settings: {
              job_tags: {
                environment: 'production',
              },
            },
          } as unknown,
        ] as Job[])
      );

      let alertExecutor: any;

      const alerts = {
        registerType: ({ executor }) => {
          alertExecutor = executor;
        },
      } as AlertingPlugin['setup'];

      const ml = ({
        mlSystemProvider: () => ({
          mlAnomalySearch: () => ({
            hits: { total: { value: 2 } },
            aggregations: {
              services: {
                buckets: [
                  {
                    key: 'foo',
                    transaction_types: {
                      buckets: [{ key: 'type-foo' }],
                    },
                    record_avg: { value: 80 },
                  },
                  {
                    key: 'bar',
                    transaction_types: {
                      buckets: [{ key: 'type-bar' }],
                    },
                    record_avg: { value: 20 },
                  },
                ],
              },
            },
          }),
        }),
        anomalyDetectorsProvider: jest.fn(),
      } as unknown) as MlPluginSetup;

      registerTransactionDurationAnomalyAlertType({
        alerts,
        ml,
        config$: mockedConfig$,
      });
      expect(alertExecutor).toBeDefined();

      const scheduleActions = jest.fn();
      const services = {
        callCluster: jest.fn(),
        alertInstanceFactory: jest.fn(() => ({ scheduleActions })),
      };
      const params = { anomalySeverityType: ANOMALY_SEVERITY.MINOR };

      await alertExecutor!({ services, params });

      await alertExecutor!({ services, params });
      [
        'apm.transaction_duration_anomaly_foo_production_type-foo',
        'apm.transaction_duration_anomaly_bar_production_type-bar',
      ].forEach((instanceName) =>
        expect(services.alertInstanceFactory).toHaveBeenCalledWith(instanceName)
      );

      expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
        serviceName: 'foo',
        transactionType: 'type-foo',
        environment: 'production',
        threshold: 'minor',
        thresholdValue: 'critical',
      });
      expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
        serviceName: 'bar',
        transactionType: 'type-bar',
        environment: 'production',
        threshold: 'minor',
        thresholdValue: 'warning',
      });
    });

    it('with service name', async () => {
      jest.spyOn(GetServiceAnomalies, 'getMLJobs').mockReturnValue(
        Promise.resolve([
          {
            job_id: '1',
            custom_settings: {
              job_tags: {
                environment: 'production',
              },
            },
          } as unknown,
          {
            job_id: '2',
            custom_settings: {
              job_tags: {
                environment: 'testing',
              },
            },
          } as unknown,
        ] as Job[])
      );

      let alertExecutor: any;

      const alerts = {
        registerType: ({ executor }) => {
          alertExecutor = executor;
        },
      } as AlertingPlugin['setup'];

      const ml = ({
        mlSystemProvider: () => ({
          mlAnomalySearch: () => ({
            hits: { total: { value: 2 } },
            aggregations: {
              services: {
                buckets: [
                  { key: 'foo', record_avg: { value: 80 } },
                  { key: 'bar', record_avg: { value: 20 } },
                ],
              },
            },
          }),
        }),
        anomalyDetectorsProvider: jest.fn(),
      } as unknown) as MlPluginSetup;

      registerTransactionDurationAnomalyAlertType({
        alerts,
        ml,
        config$: mockedConfig$,
      });
      expect(alertExecutor).toBeDefined();

      const scheduleActions = jest.fn();
      const services = {
        callCluster: jest.fn(),
        alertInstanceFactory: jest.fn(() => ({ scheduleActions })),
      };
      const params = { anomalySeverityType: ANOMALY_SEVERITY.MINOR };

      await alertExecutor!({ services, params });

      await alertExecutor!({ services, params });
      [
        'apm.transaction_duration_anomaly_foo_production',
        'apm.transaction_duration_anomaly_foo_testing',
        'apm.transaction_duration_anomaly_bar_production',
        'apm.transaction_duration_anomaly_bar_testing',
      ].forEach((instanceName) =>
        expect(services.alertInstanceFactory).toHaveBeenCalledWith(instanceName)
      );

      expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
        serviceName: 'foo',
        transactionType: undefined,
        environment: 'production',
        threshold: 'minor',
        thresholdValue: 'critical',
      });
      expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
        serviceName: 'bar',
        transactionType: undefined,
        environment: 'production',
        threshold: 'minor',
        thresholdValue: 'warning',
      });
      expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
        serviceName: 'foo',
        transactionType: undefined,
        environment: 'testing',
        threshold: 'minor',
        thresholdValue: 'critical',
      });
      expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
        serviceName: 'bar',
        transactionType: undefined,
        environment: 'testing',
        threshold: 'minor',
        thresholdValue: 'warning',
      });
    });
  });
});
