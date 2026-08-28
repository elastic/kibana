/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import type { EuiPanelProps } from '@elastic/eui';
import { EuiPanel } from '@elastic/eui';
import { useAnomalyChartPanelHighlight } from './use_anomaly_chart_panel_highlight';

type AnomalyChartPanelProps = EuiPanelProps & {
  /** When provided, the panel border is highlighted with the matching severity color. */
  anomalyScore?: number;
  children: ReactNode;
};

export function AnomalyChartPanel({
  anomalyScore,
  children,
  ...panelProps
}: AnomalyChartPanelProps) {
  const anomalyPanelHighlight = useAnomalyChartPanelHighlight(anomalyScore);

  return (
    <EuiPanel
      hasBorder={true}
      css={anomalyPanelHighlight}
      data-test-subj={anomalyScore != null ? 'apmAlertDetailsAnomalyChartPanel' : undefined}
      {...panelProps}
    >
      {children}
    </EuiPanel>
  );
}
