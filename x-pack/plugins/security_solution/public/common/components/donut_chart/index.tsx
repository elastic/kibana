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
import { DonutChartProps } from './types';

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

export const DonutChart = ({ showLegend = true, data, name, height }: DonutChartProps) => {
  const {
    colors: { danger, dangerBehindText, mean, success },
    chartTheme,
  } = useContext(ThemeContext);
  const sum = data.reduce((acc, curr) => acc + curr.value, 0);
  return (
    <EuiFlexGroup alignItems="stretch" justifyContent="center" responsive={false} gutterSize="none">
      <EuiFlexItem grow={false} style={{ position: 'relative', alignItems: 'center' }}>
        {data && data.length > 0 && (
          <EuiFlexGroup
            direction="column"
            style={{ top: '44%', width: '100%', maxWidth: '77px', position: 'absolute', zIndex: 1 }}
            gutterSize="none"
            alignItems="center"
            justifyContent="center"
          >
            <EuiFlexItem>
              <strong>{sum}</strong>
            </EuiFlexItem>
            <EuiFlexItem className="eui-textTruncate" style={{ color: success }}>
              <p className="eui-textTruncate">{name}</p>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <Chart size={height}>
          <Settings
            theme={[themeOverrides, chartTheme.theme ?? {}]}
            baseTheme={chartTheme.baseTheme}
          />
          <Partition
            id="spec_1"
            data={data}
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
          <DonutChartLegend data={data} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
