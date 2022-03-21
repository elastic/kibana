/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiSplitPanel, EuiText } from '@elastic/eui';
import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { Chart, Datum, Partition, Settings, PartitionLayout, PartialTheme } from '@elastic/charts';
import { DonutChartLegend } from './donut_chart_legend';
import { ThemeContext } from './theme_context';

interface DonutChartProps {
  low: number;
  height: number;
  high: number;
  medium: number;
  showLegend?: boolean;
  name?: string;
}

const themeOverrides: PartialTheme = {
  chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
  partition: {
    linkLabel: {
      maximumSection: Infinity,
    },
    idealFontSizeJump: 1.1,
    outerSizeRatio: 0.9,
    emptySizeRatio: 0.4,
    circlePadding: 4,
  },
};

export const DonutChart = ({
  name,
  height,
  low,
  high,
  medium,
  showLegend = true,
}: DonutChartProps) => {
  const {
    colors: { danger, dangerBehindText, mean, success },
    chartTheme,
  } = useContext(ThemeContext);
  return (
    <EuiFlexGroup alignItems="stretch" justifyContent="center" responsive={false} gutterSize="none">
      <EuiFlexItem grow={false} style={{ position: 'relative' }}>
        {name && (
          <EuiFlexGroup
            direction="column"
            style={{ top: '42%', width: '100%', position: 'absolute', zIndex: 1 }}
            gutterSize="none"
            alignItems="center"
            justifyContent="center"
          >
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{high + low + medium}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color={success} size="s">
                {name}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <Chart
          size={height}
          aria-label={i18n.translate('xpack.securitySolution.snapshot.donutChart.ariaLabel', {
            defaultMessage: 'Pie chart showing the current status.',
            values: { low, total: high + low + medium },
          })}
        >
          <Settings
            theme={[themeOverrides, chartTheme.theme ?? {}]}
            baseTheme={chartTheme.baseTheme}
          />
          <Partition
            id="spec_1"
            data={[
              { value: low, label: 'Low', name },
              { value: high, label: 'High', name },
              { value: medium, label: 'Medium', name },
            ]}
            layout={PartitionLayout.sunburst}
            valueAccessor={(d: Datum) => d.value as number}
            layers={[
              {
                groupByRollup: (d: Datum) => d.label,
                nodeLabel: (d: Datum) => d,
                shape: {
                  fillColor: (d: Datum) => {
                    return d.dataName === 'Low'
                      ? mean
                      : d.dataName === 'Medium'
                      ? dangerBehindText
                      : danger;
                  },
                },
              },
              /* The two layers below are for styling purpose,
               to make the one above thinner.
               */
              {
                groupByRollup: (d: Datum) => d.name,
                shape: {
                  fillColor: '#fff',
                },
              },
              {
                groupByRollup: (d: Datum) => d.name,
                shape: {
                  fillColor: '#fff',
                },
              },
            ]}
          />
        </Chart>
      </EuiFlexItem>
      {showLegend && (
        <EuiFlexItem style={{ alignSelf: 'center' }}>
          <DonutChartLegend low={low} high={high} medium={medium} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
