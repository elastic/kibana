/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import {
  Chart,
  Partition,
  PartitionLayout,
  Datum,
  PartialTheme,
  Settings,
} from '@elastic/charts';
import {
  EuiFlexItem,
  euiPaletteColorBlindBehindText,
  EuiTitle,
} from '@elastic/eui';

const theme: PartialTheme = {
  chartMargins: { top: 0, left: 0, bottom: 0, right: 0 },
  chartPaddings: { left: 0 },
  partition: {
    minFontSize: 5,
    idealFontSizeJump: 1.1,
    outerSizeRatio: 1,
    emptySizeRatio: 0.3,
    circlePadding: 3,
  },
};

export function SunburstChart({
  data,
  label,
  chartKey,
}: {
  data?: Array<{ key: string | number; docCount: number }>;
  label?: string;
  chartKey: string;
}) {
  const colors = euiPaletteColorBlindBehindText({ sortBy: 'natural' });
  return data?.length ? (
    <EuiFlexItem
      grow={true}
      key={chartKey}
      style={{ height: '200px', width: '200px' }}
    >
      <EuiTitle size="xs">
        <h2 style={{ fontSize: '0.8571rem' }}>{label}</h2>
      </EuiTitle>
      <Chart>
        <Settings theme={theme} />
        <Partition
          id={chartKey}
          data={data}
          layout={PartitionLayout.sunburst}
          valueAccessor={(d: Datum) => Number(d.docCount)}
          valueGetter="percent"
          layers={[
            {
              groupByRollup: (d: Datum) => d.key,
              nodeLabel: (d: Datum) => d,
              fillLabel: {
                fontWeight: 100,
                maximizeFontSize: true,
                valueFont: {
                  fontWeight: 900,
                },
              },
              shape: {
                fillColor: (_, sortIndex) => {
                  return colors[sortIndex];
                },
              },
            },
          ]}
        />
      </Chart>
    </EuiFlexItem>
  ) : null;
}
