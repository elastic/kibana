/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, transparentize } from '@elastic/eui';
import React from 'react';
import type {
  Datum,
  NodeColorAccessor,
  PartialTheme,
  ElementClickListener,
  ShapeTreeNode,
} from '@elastic/charts';
import {
  Chart,
  Partition,
  Settings,
  PartitionLayout,
  defaultPartitionValueFormatter,
} from '@elastic/charts';
import type { LegendItem } from '../../../../../common/components/charts/legend_item';
import { getColor } from './host_name_pie_chart';
import { useTheme } from '../../../../../common/components/charts/common';
// import { DraggableLegend } from '../../../../../common/components/charts/draggable_legend';
import { DonutChartEmpty } from '../../../../../common/components/charts/donutchart_empty';

interface PieChartData {
  key: string;
  value: number;
  label?: string;
}
export type FillColor = string | NodeColorAccessor;

interface PieChartProps {
  data: PieChartData[] | null | undefined;
  // fillColor: FillColor;
  height?: number;
  legendItems?: LegendItem[] | null | undefined;
  onElementClick?: ElementClickListener;
  total: number;
}

const pieTheme: PartialTheme = {
  chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
  partition: {
    idealFontSizeJump: 1.1,
    outerSizeRatio: 1,
    emptySizeRatio: 0,
    circlePadding: 4,
  },
};

const StyledEuiFlexItem = styled(EuiFlexItem)`
  align-items: center;
`;

export const PieChart = ({
  data,
  // fillColor,
  height = 90,
  legendItems,
  onElementClick,
  total,
}: PieChartProps) => {
  const theme = useTheme();
  // const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="center"
      responsive={false}
      gutterSize="l"
      data-test-subj="pie-chart"
    >
      <StyledEuiFlexItem grow={false}>
        {data == null ? (
          <DonutChartEmpty size={height} />
        ) : (
          <Chart size={height}>
            <Settings theme={pieTheme} baseTheme={theme} onElementClick={onElementClick} />
            <Partition
              id="pie-chart"
              data={data}
              layout={PartitionLayout.sunburst}
              valueAccessor={(d: Datum) => d.value as number}
              valueFormatter={(d: number) =>
                `${defaultPartitionValueFormatter(Math.round((d / total) * 100))}\u0025`
              }
              layers={[
                {
                  groupByRollup: (d: Datum) => d.label ?? d.key,
                  nodeLabel: (d: Datum) => d,
                  shape: {
                    fillColor: (d: ShapeTreeNode) =>
                      transparentize(
                        getColor(data?.length, d.sortIndex),
                        // euiPaletteColorBlind({ sortBy: 'natural' })[d.sortIndex % 10],
                        0.7
                      ),
                  },
                },
              ]}
            />
          </Chart>
        )}
      </StyledEuiFlexItem>
      {legendItems && legendItems?.length > 0 && (
        <EuiFlexItem>
          {/* <DraggableLegend legendItems={legendItems} height={height} /> */}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
