/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Chart, Metric, MetricDatum } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';

export function TopNFunctionsSummary() {
  const theme = useEuiTheme();
  const data: MetricDatum[] = useMemo(() => {
    return [
      {
        color: theme.euiTheme.colors.emptyShade,
        title: 'Total number of samples',
        icon: () => <EuiIcon type="documents" />,
        extra: (
          <span>
            Last year <strong>$12.3k</strong>
          </span>
        ),
        value: 34.2,
        valueFormatter: (v) => `${v}%`,
      },
      {
        color: theme.euiTheme.colors.emptyShade,
        title: 'Gained/Lost overaal performance by',
        icon: () => <EuiIcon type="visGauge" />,
        extra: (
          <span>
            Last year <strong>$12.3k</strong>
          </span>
        ),
        value: 59.5,
        valueFormatter: (v) => `${v}%`,
      },
      {
        color: theme.euiTheme.colors.emptyShade,
        title: 'Estimated CO2 emission impact',
        icon: () => <EuiIcon type="globe" />,
        extra: (
          <span>
            Last year <strong>$12.3k</strong>
          </span>
        ),
        value: 21.0,
        valueFormatter: (v) => `${v.toFixed(1)}%`,
      },
      {
        color: theme.euiTheme.colors.emptyShade,
        title: 'Estimated cost impact',
        icon: () => <EuiIcon type="currency" />,
        extra: (
          <span>
            Last year <strong>$12.3k</strong>
          </span>
        ),
        value: 21.0,
        valueFormatter: (v) => `${v.toFixed(1)}%`,
      },
    ];
  }, [theme.euiTheme.colors.emptyShade]);

  return (
    <EuiFlexGroup direction="row" style={{ height: 120 }}>
      {data.map((item) => {
        return (
          <EuiFlexItem key={item.title}>
            <Chart>
              <Metric id="metricId" data={[[item]]} />
            </Chart>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
