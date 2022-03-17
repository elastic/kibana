/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import { ENVIRONMENT_ALL } from '../../common/environment_filter_values';
import { Environment } from '../../common/environment_rt';
import { ApmMlDetectorType } from '../../common/anomaly_detection/apm_ml_detectors';
import { getPreferredServiceAnomalyTimeseries } from './use_preferred_service_anomaly_timeseries';
import { ServiceAnomalyTimeseries } from '../../common/anomaly_detection/service_anomaly_timeseries';

const PROD = 'production' as Environment;
const DEV = 'development' as Environment;

function createMockAnomalyTimeseries({
  type,
  environment = PROD,
  version = 3,
}: {
  type: ApmMlDetectorType;
  environment?: Environment;
  version?: number;
}): ServiceAnomalyTimeseries {
  return {
    anomalies: [],
    bounds: [],
    environment,
    jobId: uuid(),
    type,
    serviceName: 'opbeans-java',
    transactionType: 'request',
    version,
  };
}

describe('getPreferredServiceAnomalyTimeseries', () => {
  describe('with a wide set of series', () => {
    const allAnomalyTimeseries = [
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txLatency,
        environment: PROD,
      }),
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txLatency,
        environment: DEV,
      }),
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txThroughput,
        environment: PROD,
      }),
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txFailureRate,
        environment: PROD,
      }),
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txFailureRate,
        environment: PROD,
        version: 2,
      }),
    ];

    describe('with multiple environments', () => {
      describe('and all being selected', () => {
        const environment = ENVIRONMENT_ALL.value;

        it('returns no series', () => {
          expect(
            getPreferredServiceAnomalyTimeseries({
              allAnomalyTimeseries,
              detectorType: ApmMlDetectorType.txLatency,
              environment,
              fallbackToTransactions: false,
            })
          ).toBeUndefined();

          expect(
            getPreferredServiceAnomalyTimeseries({
              allAnomalyTimeseries,
              detectorType: ApmMlDetectorType.txLatency,
              environment,
              fallbackToTransactions: true,
            })
          ).toBeUndefined();
        });
      });

      describe('and production being selected', () => {
        const environment = PROD;

        it('returns the series for production', () => {
          const series = getPreferredServiceAnomalyTimeseries({
            allAnomalyTimeseries,
            detectorType: ApmMlDetectorType.txFailureRate,
            environment,
            fallbackToTransactions: false,
          });

          expect(series).toBeDefined();

          expect(series?.environment).toBe(PROD);
        });
      });
    });
  });

  describe('with multiple versions', () => {
    const allAnomalyTimeseries = [
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txLatency,
        environment: PROD,
        version: 3,
      }),
      createMockAnomalyTimeseries({
        type: ApmMlDetectorType.txLatency,
        environment: PROD,
        version: 2,
      }),
    ];

    const environment = PROD;

    it('selects the most recent version when transaction metrics are being used', () => {
      const series = getPreferredServiceAnomalyTimeseries({
        allAnomalyTimeseries,
        detectorType: ApmMlDetectorType.txLatency,
        environment,
        fallbackToTransactions: false,
      });

      expect(series?.version).toBe(3);
    });

    it('selects the legacy version when transaction metrics are being used', () => {
      const series = getPreferredServiceAnomalyTimeseries({
        allAnomalyTimeseries,
        detectorType: ApmMlDetectorType.txLatency,
        environment,
        fallbackToTransactions: true,
      });

      expect(series?.version).toBe(2);
    });
  });
});
