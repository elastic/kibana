/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';

import React from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { getEmptySeries } from '../../../shared/charts/CustomPlot/getEmptySeries';
import { SparkPlot } from '../../../shared/charts/SparkPlot';

export function ServiceListMetric({
  color,
  series,
  valueLabel,
}: {
  color: 'euiColorVis1' | 'euiColorVis0' | 'euiColorVis7';
  series?: Array<{ x: number; y: number | null }>;
  valueLabel: React.ReactNode;
}) {
  const theme = useTheme();

  const {
    urlParams: { start, end },
  } = useUrlParams();

  const colorValue = theme.eui[color];

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem grow={false}>
        <SparkPlot
          series={
            series ??
            getEmptySeries(parseFloat(start!), parseFloat(end!))[0].data
          }
          color={colorValue}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ whiteSpace: 'nowrap' }}>
        {valueLabel}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
