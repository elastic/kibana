/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { Chart, Datum, Partition, Settings, PartitionLayout, PartialTheme } from '@elastic/charts';
import { DonutChartLegend } from './donut_chart_legend';
import { UptimeThemeContext } from '../../../contexts';

interface DonutChartProps {
  down: number;
  height: number;
  up: number;
}

export const GreenCheckIcon = styled(EuiIcon)`
  height: 42px;
  width: 42px;
  color: #017d73;
  top: 51px;
  left: 51px;
  position: absolute;
`;

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

export const DonutChart = ({ height, down, up }: DonutChartProps) => {
  const {
    colors: { danger, gray },
    chartTheme,
  } = useContext(UptimeThemeContext);

  return (
    <EuiFlexGroup alignItems="center" responsive={false}>
      <EuiFlexItem grow={false} style={{ position: 'relative' }}>
        <Chart
          size={height}
          aria-label={i18n.translate('xpack.uptime.snapshot.donutChart.ariaLabel', {
            defaultMessage:
              'Pie chart showing the current status. {down} of {total} monitors are down.',
            values: { down, total: up + down },
          })}
        >
          <Settings
            theme={[themeOverrides, chartTheme.theme ?? {}]}
            baseTheme={chartTheme.baseTheme}
          />
          <Partition
            id="spec_1"
            data={[
              { value: down, label: 'Down' },
              { value: up, label: 'Up' },
            ]}
            layout={PartitionLayout.sunburst}
            valueAccessor={(d: Datum) => d.value as number}
            layers={[
              {
                groupByRollup: (d: Datum) => d.label,
                nodeLabel: (d: Datum) => d,
                shape: {
                  fillColor: (d: Datum) => {
                    return d.dataName === 'Down' ? danger : gray;
                  },
                },
              },
            ]}
          />
        </Chart>
        {down === 0 && <GreenCheckIcon className="greenCheckIcon" type="checkInCircleFilled" />}
      </EuiFlexItem>
      <EuiFlexItem>
        <DonutChartLegend down={down} up={up} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
