/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ApmMlDetectorType,
  getApmMlDetectorIndex,
} from '../../../../../common/anomaly_detection/apm_ml_detectors';
import { ANOMALY_DETECTOR_TYPES } from '../../../../../common/rules/apm_rule_types';

export function getAnomalyDetectorTypeIndex(
  detectorType: ANOMALY_DETECTOR_TYPES
) {
  if (detectorType) {
    switch (detectorType) {
      case ANOMALY_DETECTOR_TYPES.LATENCY:
        return getApmMlDetectorIndex(ApmMlDetectorType.txLatency);
      case ANOMALY_DETECTOR_TYPES.THROUGHPUT:
        return getApmMlDetectorIndex(ApmMlDetectorType.txThroughput);
      case ANOMALY_DETECTOR_TYPES.FAILED_TRANSACTION_RATE:
        return getApmMlDetectorIndex(ApmMlDetectorType.txFailureRate);
    }
  }
}
