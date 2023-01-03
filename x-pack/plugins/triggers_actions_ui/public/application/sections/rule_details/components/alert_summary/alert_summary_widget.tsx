/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useLoadAlertSummary } from '../../../../hooks/use_load_alert_summary';
import { AlertSummaryWidgetProps } from '.';
import { AlertSummaryWidgetError, AlertsSummaryWidgetCompact } from './components';

export const AlertSummaryWidget = ({
  featureIds,
  filter,
  onClick,
  timeRange,
}: AlertSummaryWidgetProps) => {
  const {
    alertSummary: { activeAlertCount, activeAlerts, recoveredAlertCount, recoveredAlerts },
    isLoading,
    error,
  } = useLoadAlertSummary({
    featureIds,
    filter,
    timeRange,
  });

  if (isLoading) return <EuiLoadingSpinner />;
  if (error) return <AlertSummaryWidgetError />;

  return (
    <AlertsSummaryWidgetCompact
      activeAlertCount={activeAlertCount}
      activeAlerts={activeAlerts}
      onClick={onClick}
      recoveredAlertCount={recoveredAlertCount}
      recoveredAlerts={recoveredAlerts}
      timeRangeTitle={timeRange.title}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertSummaryWidget as default };
