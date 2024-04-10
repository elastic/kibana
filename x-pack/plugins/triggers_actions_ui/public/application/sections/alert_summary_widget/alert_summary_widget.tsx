/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useLoadAlertSummary } from '../../hooks/use_load_alert_summary';
import { AlertSummaryWidgetProps } from '.';
import {
  AlertSummaryWidgetError,
  AlertSummaryWidgetCompact,
  AlertSummaryWidgetFullSize,
  AlertSummaryWidgetLoader,
} from './components';

export const AlertSummaryWidget = ({
  chartProps,
  featureIds,
  filter,
  fullSize,
  onClick = () => {},
  timeRange,
  hideChart,
  onLoaded,
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

  useEffect(() => {
    if (!isLoading && onLoaded) {
      onLoaded({ activeAlertCount, recoveredAlertCount });
    }
  }, [activeAlertCount, isLoading, onLoaded, recoveredAlertCount]);

  if (isLoading)
    return <AlertSummaryWidgetLoader fullSize={fullSize} isLoadingWithoutChart={hideChart} />;

  if (error) return <AlertSummaryWidgetError />;

  return fullSize ? (
    // Only show full size version if there is data
    activeAlertCount || recoveredAlertCount ? (
      <AlertSummaryWidgetFullSize
        activeAlertCount={activeAlertCount}
        activeAlerts={activeAlerts}
        chartProps={chartProps}
        dateFormat={timeRange.dateFormat}
        recoveredAlertCount={recoveredAlertCount}
        hideChart={hideChart}
      />
    ) : null
  ) : (
    <AlertSummaryWidgetCompact
      activeAlertCount={activeAlertCount}
      activeAlerts={activeAlerts}
      chartProps={chartProps}
      onClick={onClick}
      recoveredAlertCount={recoveredAlertCount}
      timeRangeTitle={timeRange.title}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertSummaryWidget as default };
