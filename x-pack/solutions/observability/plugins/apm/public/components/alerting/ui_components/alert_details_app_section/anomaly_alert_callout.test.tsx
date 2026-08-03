/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils/anomaly_threshold';
import { AnomalyDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';
import { AnomalyAlertCallout } from './anomaly_alert_callout';
import { formatAnomalyCalloutBody, formatAnomalyCalloutTitle } from './helpers';

const criticalLatencyAlert = {
  severity: ML_ANOMALY_SEVERITY.CRITICAL,
  detectorType: AnomalyDetectorType.txLatency,
  alertEvaluationThreshold: ML_ANOMALY_THRESHOLD.WARNING,
} as const;

const majorThroughputAlert = {
  severity: ML_ANOMALY_SEVERITY.MAJOR,
  detectorType: AnomalyDetectorType.txThroughput,
  alertEvaluationThreshold: ML_ANOMALY_THRESHOLD.MAJOR,
} as const;

const criticalLatencyTitle = formatAnomalyCalloutTitle({
  alertSeverity: criticalLatencyAlert.severity,
  detectorType: criticalLatencyAlert.detectorType,
});
const warningThresholdBody = formatAnomalyCalloutBody(
  criticalLatencyAlert.alertEvaluationThreshold
);
const majorThroughputTitle = formatAnomalyCalloutTitle({
  alertSeverity: majorThroughputAlert.severity,
  detectorType: majorThroughputAlert.detectorType,
});
const majorThresholdBody = formatAnomalyCalloutBody(majorThroughputAlert.alertEvaluationThreshold);

const renderComponent = (props: React.ComponentProps<typeof AnomalyAlertCallout>) =>
  render(
    <EuiProvider>
      <AnomalyAlertCallout {...props} />
    </EuiProvider>
  );

describe('AnomalyAlertCallout', () => {
  it('renders the anomaly callout with severity, detector title and rule threshold body', () => {
    renderComponent(criticalLatencyAlert);

    expect(screen.getByTestId('apmAlertDetailsAnomalyCallout')).toBeInTheDocument();
    expect(screen.getByText(criticalLatencyTitle)).toBeInTheDocument();
    expect(screen.getByText(warningThresholdBody)).toBeInTheDocument();
  });

  it('renders throughput detector in the title', () => {
    renderComponent(majorThroughputAlert);

    expect(screen.getByText(majorThroughputTitle)).toBeInTheDocument();
    expect(screen.getByText(majorThresholdBody)).toBeInTheDocument();
  });
});
