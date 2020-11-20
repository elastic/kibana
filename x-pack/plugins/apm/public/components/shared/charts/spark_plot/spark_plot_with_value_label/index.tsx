/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';

import React from 'react';
import { useTheme } from '../../../../../hooks/useTheme';
import { getEmptySeries } from '../../CustomPlot/getEmptySeries';
import { SparkPlot } from '../';

type Color =
  | 'euiColorVis0'
  | 'euiColorVis1'
  | 'euiColorVis2'
  | 'euiColorVis3'
  | 'euiColorVis4'
  | 'euiColorVis5'
  | 'euiColorVis6'
  | 'euiColorVis7'
  | 'euiColorVis8'
  | 'euiColorVis9';

export function SparkPlotWithValueLabel({
  start,
  end,
  color,
  series,
  valueLabel,
}: {
  start: number;
  end: number;
  color: Color;
  series?: Array<{ x: number; y: number | null }>;
  valueLabel: React.ReactNode;
}) {
  const theme = useTheme();

  const colorValue = theme.eui[color];

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem grow={false}>
        <SparkPlot
          series={series ?? getEmptySeries(start, end)[0].data}
          color={colorValue}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ whiteSpace: 'nowrap' }}>
        {valueLabel}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
