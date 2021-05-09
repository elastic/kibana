/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexItem, EuiPanel, EuiButton } from '@elastic/eui';
import { MLIntegrationComponent } from '../ml/ml_integeration';
import { AnomalyRecords } from '../../../state/actions';
import { AllSeries, ExploratoryViewEmbeddable } from '../../../../../observability/public';

interface DurationChartProps {
  loading: boolean;
  hasMLJob: boolean;
  anomalies: AnomalyRecords | null;
  exploratoryViewLink: string;
  exploratoryViewAttributes: AllSeries;
}

/**
 * This chart is intended to visualize monitor duration performance over time to
 * the users in a helpful way. Its x-axis is based on a timeseries, the y-axis is in
 * milliseconds.
 * @param props The props required for this component to render properly
 */
export const MonitorDurationComponent = ({
  anomalies,
  loading,
  hasMLJob,
  exploratoryViewLink,
  exploratoryViewAttributes,
}: DurationChartProps) => {
  return (
    <EuiPanel paddingSize="m" style={{ paddingBottom: 0 }}>
      <ExploratoryViewEmbeddable
        attributes={exploratoryViewAttributes}
        title={
          hasMLJob ? (
            <FormattedMessage
              id="xpack.uptime.monitorCharts.monitorDuration.titleLabelWithAnomaly"
              defaultMessage="Monitor duration (Anomalies: {noOfAnomalies})"
              values={{ noOfAnomalies: anomalies?.anomalies?.length ?? 0 }}
            />
          ) : (
            <FormattedMessage
              id="xpack.uptime.monitorCharts.monitorDuration.titleLabel"
              defaultMessage="Monitor duration"
            />
          )
        }
        appendTitle={
          <>
            <EuiFlexItem grow={false}>
              <MLIntegrationComponent />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" isDisabled={loading} href={exploratoryViewLink}>
                <FormattedMessage
                  id="xpack.uptime.monitorDuration.analyze"
                  defaultMessage="Analyze"
                />
              </EuiButton>
            </EuiFlexItem>
          </>
        }
      />
    </EuiPanel>
  );
};
