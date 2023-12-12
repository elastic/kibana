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
import { AnomalyAlertDetectorType } from '../../../../../common/rules/apm_rule_types';

export function getAnomalyDetectorTypeIndex(
  detectorTypes: AnomalyAlertDetectorType[]
) {
  return detectorTypes.map((detector) => {
    switch (detector) {
      case 'latency':
        return getApmMlDetectorIndex(ApmMlDetectorType.txLatency);
      case 'throughput':
        return getApmMlDetectorIndex(ApmMlDetectorType.txThroughput);
      case 'failed_transaction_rate':
        return getApmMlDetectorIndex(ApmMlDetectorType.txFailureRate);
    }
  });
}
