/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Chart, Settings, Metric, MetricDatum } from '@elastic/charts';
import { DARK_THEME } from '@elastic/charts';
import { EuiLoadingContent, EuiPanel } from '@elastic/eui';

export function MetricItem({
  data,
  id,
  isLoading,
}: {
  data: MetricDatum[];
  id: number;
  isLoading: boolean;
}) {
  return (
    <div
      style={{
        resize: 'none',
        padding: '0px',
        overflow: 'auto',
        height: '100px',
        borderRadius: '6px',
      }}
    >
      {isLoading ? (
        <EuiPanel hasBorder={true}>
          <EuiLoadingContent lines={3} />
        </EuiPanel>
      ) : (
        <Chart>
          <Settings baseTheme={DARK_THEME} />
          <Metric id={`metric_${id}`} data={[data]} />
        </Chart>
      )}
    </div>
  );
}
