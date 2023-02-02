/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingChart } from '@elastic/eui';
import React from 'react';
import { useLoadAlertSummary } from '../../../../hooks/use_load_alert_summary';
import { AlertSummaryWidgetProps } from '.';
import {
  AlertSummaryWidgetError,
  AlertsSummaryWidgetCompact,
  AlertsSummaryWidgetFullSize,
} from './components';

export const AlertSummaryWidget = ({
  featureIds,
  filter,
  fullSize,
  onClick = () => {},
  timeRange,
  chartThemes,
}: AlertSummaryWidgetProps) => {
  const {
    alertSummary: { activeAlertCount, activeAlerts, recoveredAlertCount },
    isLoading,
    error,
  } = useLoadAlertSummary({
    featureIds,
    filter,
    timeRange,
  });

  if (isLoading)
    return (
      <div
        style={{
          minHeight: fullSize ? 238 : 224,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EuiLoadingChart size="l" data-test-subj="alertSummaryWidgetLoading" />
      </div>
    );
  if (error) return <AlertSummaryWidgetError />;

  return fullSize ? (
    // Only show full size version if there is data
    activeAlertCount || recoveredAlertCount ? (
      <AlertsSummaryWidgetFullSize
        activeAlertCount={activeAlertCount}
        activeAlerts={activeAlerts}
        recoveredAlertCount={recoveredAlertCount}
        dateFormat={timeRange.dateFormat}
        chartThemes={chartThemes}
      />
    ) : null
  ) : (
    <AlertsSummaryWidgetCompact
      activeAlertCount={activeAlertCount}
      activeAlerts={activeAlerts}
      onClick={onClick}
      recoveredAlertCount={recoveredAlertCount}
      timeRangeTitle={timeRange.title}
      chartThemes={chartThemes}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertSummaryWidget as default };
