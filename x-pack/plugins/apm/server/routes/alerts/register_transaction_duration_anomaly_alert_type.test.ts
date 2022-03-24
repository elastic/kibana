/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { registerTransactionDurationAnomalyAlertType } from './register_transaction_duration_anomaly_alert_type';
import { ANOMALY_SEVERITY } from '../../../common/ml_constants';
import { MlPluginSetup } from '../../../../ml/server';
import * as GetServiceAnomalies from '../service_map/get_service_anomalies';
import { createRuleTypeMocks } from './test_utils';
import { ApmMlJob } from '../../../common/anomaly_detection/apm_ml_job';

describe('Transaction duration anomaly alert', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe("doesn't send alert", () => {
    it('ml is not defined', async () => {
      const { services, dependencies, executor } = createRuleTypeMocks();

      registerTransactionDurationAnomalyAlertType({
        ...dependencies,
        ml: undefined,
      });

      const params = { anomalySeverityType: ANOMALY_SEVERITY.MINOR };

      await executor({ params });

      expect(
        services.scopedClusterClient.asCurrentUser.search
      ).not.toHaveBeenCalled();

      expect(services.alertFactory.create).not.toHaveBeenCalled();
    });

    it('ml jobs are not available', async () => {
      jest
        .spyOn(GetServiceAnomalies, 'getMLJobs')
        .mockReturnValue(Promise.resolve([]));

      const { services, dependencies, executor } = createRuleTypeMocks();

      const ml = {
        mlSystemProvider: () => ({ mlAnomalySearch: jest.fn() }),
        anomalyDetectorsProvider: jest.fn(),
      } as unknown as MlPluginSetup;

      registerTransactionDurationAnomalyAlertType({
        ...dependencies,
        ml,
      });

      const params = { anomalySeverityType: ANOMALY_SEVERITY.MINOR };

      await executor({ params });
      expect(
        services.scopedClusterClient.asCurrentUser.search
      ).not.toHaveBeenCalled();

      expect(services.alertFactory.create).not.toHaveBeenCalled();
    });

    it('anomaly is less than threshold', async () => {
      jest.spyOn(GetServiceAnomalies, 'getMLJobs').mockReturnValue(
        Promise.resolve([
          {
            jobId: '1',
            environment: 'development',
          },
          {
            jobId: '2',
            environment: 'production',
          },
        ] as unknown as ApmMlJob[])
      );

      const { services, dependencies, executor } = createRuleTypeMocks();

      const ml = {
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
      } as unknown as MlPluginSetup;

      registerTransactionDurationAnomalyAlertType({
        ...dependencies,
        ml,
      });

      const params = { anomalySeverityType: ANOMALY_SEVERITY.MINOR };

      await executor({ params });

      expect(
        services.scopedClusterClient.asCurrentUser.search
      ).not.toHaveBeenCalled();
      expect(services.alertFactory.create).not.toHaveBeenCalled();
    });
  });

  describe('sends alert', () => {
    it('for all services that exceeded the threshold', async () => {
      jest.spyOn(GetServiceAnomalies, 'getMLJobs').mockReturnValue(
        Promise.resolve([
          {
            jobId: '1',
            environment: 'development',
          },
          {
            jobId: '2',
            environment: 'production',
          },
        ] as unknown as ApmMlJob[])
      );

      const { services, dependencies, executor, scheduleActions } =
        createRuleTypeMocks();

      const ml = {
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
      } as unknown as MlPluginSetup;

      registerTransactionDurationAnomalyAlertType({
        ...dependencies,
        ml,
      });

      const params = {
        anomalySeverityType: ANOMALY_SEVERITY.MINOR,
        windowSize: 5,
        windowUnit: 'm',
      };

      await executor({ params });

      expect(services.alertFactory.create).toHaveBeenCalledTimes(1);

      expect(services.alertFactory.create).toHaveBeenCalledWith(
        'apm.transaction_duration_anomaly_foo_development_type-foo'
      );

      expect(scheduleActions).toHaveBeenCalledWith('threshold_met', {
        serviceName: 'foo',
        transactionType: 'type-foo',
        environment: 'development',
        threshold: 'minor',
        triggerValue: 'critical',
        reason:
          'critical anomaly with a score of 80 was detected in the last 5 mins for foo.',
        viewInAppUrl:
          'http://localhost:5601/eyr/app/apm/services/foo?transactionType=type-foo&environment=development',
      });
    });
  });
});
