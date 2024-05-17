/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { LocationDurationLine } from '../../../../../common/types';
import { AnomalyRecords } from '../../../state/actions';
import { DurationChartComponent } from '../../common/charts';
import { MLIntegrationComponent } from '../ml/ml_integeration';

interface DurationChartProps {
  loading: boolean;
  hasMLJob: boolean;
  anomalies: AnomalyRecords | null;
  locationDurationLines: LocationDurationLine[];
}

/**
 * This chart is intended to visualize monitor duration performance over time to
 * the users in a helpful way. Its x-axis is based on a timeseries, the y-axis is in
 * milliseconds.
 * @param props The props required for this component to render properly
 */
export const MonitorDurationComponent = ({
  locationDurationLines,
  anomalies,
  loading,
  hasMLJob,
}: DurationChartProps) => {
  return (
    <EuiPanel paddingSize="m" hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              {hasMLJob ? (
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
              )}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MLIntegrationComponent />
        </EuiFlexItem>
        {/* <EuiFlexItem grow={false}>*/}
        {/*  <EuiButton size="s" isDisabled={loading} href={exploratoryViewLink}>*/}
        {/*    <FormattedMessage id="xpack.uptime.monitorDuration.analyze" defaultMessage="Analyze" />*/}
        {/*  </EuiButton>*/}
        {/* </EuiFlexItem>*/}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <DurationChartComponent
        locationDurationLines={locationDurationLines}
        loading={loading}
        anomalies={anomalies}
      />
    </EuiPanel>
  );
};
