/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import type { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { AnomalyDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';
import {
  formatAnomalyCalloutBody,
  formatAnomalyCalloutTitle,
  getAnomalyCalloutColor,
} from './helpers';

export interface AnomalyAlertCalloutProps {
  severity: ML_ANOMALY_SEVERITY;
  detectorType: AnomalyDetectorType;
  alertEvaluationThreshold: number;
}

export function AnomalyAlertCallout({
  severity,
  detectorType,
  alertEvaluationThreshold,
}: AnomalyAlertCalloutProps) {
  return (
    <EuiCallOut
      announceOnMount
      title={formatAnomalyCalloutTitle({ alertSeverity: severity, detectorType })}
      color={getAnomalyCalloutColor(severity)}
      data-test-subj="apmAlertDetailsAnomalyCallout"
    >
      <p>{formatAnomalyCalloutBody(alertEvaluationThreshold)}</p>
    </EuiCallOut>
  );
}
