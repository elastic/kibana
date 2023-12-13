/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ApmMlDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';

export function getApmMlDetectorLabel(type: ApmMlDetectorType) {
  switch (type) {
    case ApmMlDetectorType.txLatency:
      return i18n.translate('xpack.apm.alerts.anomalyDetector.latencyLabel', {
        defaultMessage: 'latency',
      });
    case ApmMlDetectorType.txThroughput:
      return i18n.translate(
        'xpack.apm.alerts.anomalyDetector.throughputLabel',
        {
          defaultMessage: 'throughput',
        }
      );
    case ApmMlDetectorType.txFailureRate:
      return i18n.translate(
        'xpack.apm.alerts.anomalyDetector.failedTransactionRateLabel',
        {
          defaultMessage: 'failed transaction rate',
        }
      );
  }
}
