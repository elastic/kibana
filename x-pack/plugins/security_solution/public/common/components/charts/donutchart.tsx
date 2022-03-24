/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiTextColor } from '@elastic/eui';
import React, { useContext, useMemo } from 'react';

import { Chart, Datum, Partition, Settings, PartitionLayout } from '@elastic/charts';
import uuid from 'uuid';
import { ThemeContext } from './donut_theme_context';
import { useTheme } from './common';
import { DraggableLegend } from './draggable_legend';
import { LegendItem } from './draggable_legend_item';
import { escapeDataProviderId } from '../drag_and_drop/helpers';

export const NO_LEGEND_DATA: LegendItem[] = [];

export interface DonutChartData {
  value: number;
  label: string;
  name: string;
}

export interface DonutChartProps {
  showLegend?: boolean;
  data: DonutChartData[];
  name: string;
  height: number;
  legendField?: string;
}

export const EmptyDonutChart = () => {
  return (
    <div
      style={{
        borderRadius: '50%',
        height: '120px',
        width: '120px',
        backgroundColor: '#FAFBFD',
        textAlign: 'center',
        lineHeight: '120px',
      }}
    >
      <div
        style={{
          borderRadius: '50%',
          height: '100px',
          width: '100px',
          backgroundColor: 'white',
          display: 'inline-block',
          verticalAlign: 'middle',
        }}
      />
    </div>
  );
};

export const DonutChart = ({
  showLegend = true,
  data,
  name,
  height,
  legendField,
}: DonutChartProps) => {
  const theme = useTheme();

  const { colors, chartTheme } = useContext(ThemeContext);
  const sum = data.reduce((acc, curr) => acc + curr.value, 0);

  const legendItems: LegendItem[] = useMemo(
    () =>
      data != null && legendField
        ? data.map((d, i) => ({
            color: colors[i],
            dataProviderId: escapeDataProviderId(`draggable-legend-item-${uuid.v4()}-${d.name}`),
            timelineId: undefined,
            field: legendField,
            value: `${d.label}`,
          }))
        : NO_LEGEND_DATA,
    [colors, data, legendField]
  );

  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" responsive={false} gutterSize="l">
      <EuiFlexItem grow={false} style={{ position: 'relative', alignItems: 'center' }}>
        {data && data.length > 0 && (
          <EuiFlexGroup
            direction="column"
            style={{ top: '35%', width: '100%', maxWidth: '77px', position: 'absolute', zIndex: 1 }}
            gutterSize="none"
            alignItems="center"
            justifyContent="center"
          >
            <EuiFlexItem>
              <strong>{sum}</strong>
            </EuiFlexItem>
            <EuiFlexItem className="eui-textTruncate">
              {sum === 0 && (
                <EuiTextColor color="#ABB4C4" className="eui-textTruncate">
                  {name}
                </EuiTextColor>
              )}
              {sum !== 0 && <EuiLink className="eui-textTruncate">{name}</EuiLink>}
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {sum === 0 && <EmptyDonutChart />}
        {sum !== 0 && (
          <Chart size={height}>
            <Settings theme={chartTheme.theme} baseTheme={theme} />
            <Partition
              id="spec_1"
              data={data}
              layout={PartitionLayout.sunburst}
              valueAccessor={(d: Datum) => d.value as number}
              layers={[
                {
                  groupByRollup: () => '',
                  nodeLabel: () => '',
                  shape: {
                    fillColor: () => '#fff',
                  },
                },
                {
                  groupByRollup: () => '',
                  nodeLabel: () => '',
                  shape: {
                    fillColor: () => '#fff',
                  },
                },
                /* The layers above are for styling purpose,
               to make the one above thinner.
               */
                {
                  groupByRollup: (d: Datum) => d.label,
                  nodeLabel: (d: Datum) => d,
                  shape: {
                    fillColor: (d: Datum) => {
                      return colors[d.sortIndex];
                    },
                  },
                },
              ]}
            />
          </Chart>
        )}
      </EuiFlexItem>
      {showLegend && legendItems && (
        <EuiFlexItem>
          <DraggableLegend legendItems={legendItems} height={height} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
