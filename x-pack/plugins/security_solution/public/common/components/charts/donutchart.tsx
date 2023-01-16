/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';

import type { Datum, NodeColorAccessor, PartialTheme, ElementClickListener } from '@elastic/charts';
import {
  Chart,
  Partition,
  Settings,
  PartitionLayout,
  defaultPartitionValueFormatter,
} from '@elastic/charts';
import styled from 'styled-components';
import { useTheme } from './common';
import { DraggableLegend } from './draggable_legend';
import type { LegendItem } from './draggable_legend_item';
import { DonutChartEmpty } from './donutchart_empty';

const donutTheme: PartialTheme = {
  chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
  partition: {
    idealFontSizeJump: 1.1,
    outerSizeRatio: 1,
    emptySizeRatio: 0.8,
    circlePadding: 4,
  },
};

interface DonutChartData {
  key: string;
  value: number;
  group?: string;
  label?: string;
}

export type FillColor = string | NodeColorAccessor;
export interface DonutChartProps {
  data: DonutChartData[] | null | undefined;
  fillColor: FillColor;
  height?: number;
  label: React.ReactElement | string;
  legendItems?: LegendItem[] | null | undefined;
  title: React.ReactElement | string | number | null;
  totalCount: number | null | undefined;
  onElementClick?: ElementClickListener;
}

/* Make this position absolute in order to overlap the text onto the donut */
const DonutTextWrapper = styled(EuiFlexGroup)`
  top: 34%;
  width: 100%;
  max-width: 77px;
  position: absolute;
  z-index: 1;
`;

const StyledEuiFlexItem = styled(EuiFlexItem)`
  position: relative;
  align-items: center;
`;

export const DonutChart = ({
  data,
  fillColor,
  height = 90,
  label,
  legendItems,
  title,
  totalCount,
  onElementClick,
}: DonutChartProps) => {
  const theme = useTheme();
  const { euiTheme } = useEuiTheme();
  const emptyLabelStyle = useMemo(
    () => ({
      color: euiTheme.colors.disabled,
    }),
    [euiTheme.colors.disabled]
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="center"
      responsive={false}
      gutterSize="l"
      data-test-subj="donut-chart"
    >
      <StyledEuiFlexItem grow={false}>
        <DonutTextWrapper
          direction="column"
          gutterSize="none"
          alignItems="center"
          justifyContent="center"
        >
          <EuiFlexItem>{title}</EuiFlexItem>
          <EuiFlexItem className="eui-textTruncate">
            <EuiToolTip content={label}>
              <EuiText
                className="eui-textTruncate"
                size="s"
                style={data ? undefined : emptyLabelStyle}
              >
                {label}
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        </DonutTextWrapper>
        {data == null || totalCount == null || totalCount === 0 ? (
          <DonutChartEmpty size={height} />
        ) : (
          <Chart size={height}>
            <Settings theme={donutTheme} baseTheme={theme} onElementClick={onElementClick} />
            <Partition
              id="donut-chart"
              data={data}
              layout={PartitionLayout.sunburst}
              valueAccessor={(d: Datum) => d.value as number}
              valueFormatter={(d: number) => `${defaultPartitionValueFormatter(d)}`}
              layers={[
                {
                  groupByRollup: (d: Datum) => d.label ?? d.key,
                  nodeLabel: (d: Datum) => d,
                  shape: {
                    fillColor,
                  },
                },
              ]}
            />
          </Chart>
        )}
      </StyledEuiFlexItem>
      {legendItems && legendItems?.length > 0 && (
        <EuiFlexItem>
          <DraggableLegend legendItems={legendItems} height={height} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
