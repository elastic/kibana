/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { registerAnomalyRuleType } from './register_anomaly_rule_type';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { MlPluginSetup } from '@kbn/ml-plugin/server';
import * as GetServiceAnomalies from '../../../service_map/get_service_anomalies';
import { createRuleTypeMocks } from '../../test_utils';
import { ApmMlJob } from '../../../../../common/anomaly_detection/apm_ml_job';
import {
  AnomalyDetectorType,
  getAnomalyDetectorIndex,
} from '../../../../../common/anomaly_detection/apm_ml_detectors';

describe('Transaction duration anomaly alert', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe("doesn't send alert", () => {
    it('ml is not defined', async () => {
      const { services, dependencies, executor } = createRuleTypeMocks();

      registerAnomalyRuleType({
        ...dependencies,
        ml: undefined,
      });

      const params = {
        anomalySeverityType: ML_ANOMALY_SEVERITY.MINOR,
        anomalyDetectorTypes: [AnomalyDetectorType.txLatency],
      };

      await executor({ params });

      expect(services.scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();

      expect(services.alertsClient.report).not.toHaveBeenCalled();
    });

    it('ml jobs are not available', async () => {
      jest.spyOn(GetServiceAnomalies, 'getMLJobs').mockReturnValue(Promise.resolve([]));

      const { services, dependencies, executor } = createRuleTypeMocks();

      const ml = {
        mlSystemProvider: () => ({ mlAnomalySearch: jest.fn() }),
        anomalyDetectorsProvider: jest.fn(),
      } as unknown as MlPluginSetup;

      registerAnomalyRuleType({
        ...dependencies,
        ml,
      });

      const params = {
        anomalySeverityType: ML_ANOMALY_SEVERITY.MINOR,
        anomalyDetectorTypes: [AnomalyDetectorType.txLatency],
      };

      await executor({ params });
      expect(services.scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();

      expect(services.alertsClient.report).not.toHaveBeenCalled();
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
                      top: [
                        {
                          metrics: {
                            record_score: 0,
                            job_id: '1',
                            detector_index: getAnomalyDetectorIndex(AnomalyDetectorType.txLatency),
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

      registerAnomalyRuleType({
        ...dependencies,
        ml,
      });

      const params = {
        anomalySeverityType: ML_ANOMALY_SEVERITY.MINOR,
        anomalyDetectorTypes: [AnomalyDetectorType.txLatency],
        windowSize: 5,
        windowUnit: 'm',
      };

      await executor({ params });

      expect(services.scopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
      expect(services.alertsClient.report).not.toHaveBeenCalled();
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

      const { services, dependencies, executor } = createRuleTypeMocks();

      services.alertsClient.report.mockReturnValue({ uuid: 'test-uuid' });

      const ml = {
        mlSystemProvider: () => ({
          mlAnomalySearch: () => ({
            aggregations: {
              anomaly_groups: {
                buckets: [
                  {
                    key: ['apm.anomaly', 'foo', 'development', 'type-foo'],
                    latest_score: {
                      top: [
                        {
                          metrics: {
                            record_score: 80,
                            job_id: '1',
                            partition_field_value: 'foo',
                            by_field_value: 'type-foo',
                            detector_index: getAnomalyDetectorIndex(AnomalyDetectorType.txLatency),
                          },
                        },
                      ],
                    },
                  },
                  {
                    key: ['apm.anomaly', 'bar', 'production', 'type-bar'],
                    latest_score: {
                      top: [
                        {
                          metrics: {
                            record_score: 20,
                            job_id: '2',
                            parttition_field_value: 'bar',
                            by_field_value: 'type-bar',
                            detector_index: getAnomalyDetectorIndex(AnomalyDetectorType.txLatency),
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

      registerAnomalyRuleType({
        ...dependencies,
        ml,
      });

      const params = {
        anomalySeverityType: ML_ANOMALY_SEVERITY.MINOR,
        anomalyDetectorTypes: [AnomalyDetectorType.txLatency],
        windowSize: 5,
        windowUnit: 'm',
      };

      await executor({ params });

      expect(services.alertsClient.report).toHaveBeenCalledTimes(1);

      expect(services.alertsClient.report).toHaveBeenCalledWith({
        actionGroup: 'threshold_met',
        id: 'apm.anomaly_foo_development_type-foo',
      });

      expect(services.alertsClient.setAlertData).toHaveBeenCalledWith({
        context: {
          alertDetailsUrl: 'mockedAlertsLocator > getLocation',
          environment: 'development',
          reason:
            'critical latency anomaly with a score of 80, was detected in the last 5 mins for foo.',
          serviceName: 'foo',
          threshold: 'minor',
          transactionType: 'type-foo',
          triggerValue: 'critical',
          viewInAppUrl:
            'http://localhost:5601/eyr/app/apm/services/foo?transactionType=type-foo&environment=development',
        },
        id: 'apm.anomaly_foo_development_type-foo',
        payload: {
          'kibana.alert.evaluation.threshold': 25,
          'kibana.alert.evaluation.value': 80,
          'kibana.alert.reason':
            'critical latency anomaly with a score of 80, was detected in the last 5 mins for foo.',
          'kibana.alert.severity': 'critical',
          'processor.event': 'transaction',
          'service.environment': 'development',
          'service.name': 'foo',
          'transaction.type': 'type-foo',
        },
      });
    });
  });
});
