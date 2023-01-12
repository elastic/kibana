/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlexGroupProps } from '@elastic/eui';
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
  isChartEmbeddablesEnabled?: boolean;
  label: React.ReactElement | string;
  legendItems?: LegendItem[] | null | undefined;
  onElementClick?: ElementClickListener;
  title: React.ReactElement | string | number | null;
  totalCount: number | null | undefined;
}

export interface DonutChartWrapperProps {
  children?: React.ReactElement;
  dataExists: boolean;
  label: React.ReactElement | string;
  title: React.ReactElement | string | number | null;
  isChartEmbeddablesEnabled?: boolean;
}

/* Make this position absolute in order to overlap the text onto the donut */
export const DonutTextWrapper = styled(EuiFlexGroup)<
  EuiFlexGroupProps & { $isChartEmbeddablesEnabled?: boolean; $dataExists?: boolean }
>`
  top: ${({ $isChartEmbeddablesEnabled, $dataExists }) =>
    $isChartEmbeddablesEnabled && !$dataExists ? `66%` : `34%;`};
  width: 100%;
  max-width: 77px;
  position: absolute;
  z-index: 1;
`;

export const StyledEuiFlexItem = styled(EuiFlexItem)`
  position: relative;
  align-items: center;
`;

const DonutChartWrapperComponent: React.FC<DonutChartWrapperProps> = ({
  children,
  dataExists,
  isChartEmbeddablesEnabled,
  label,
  title,
}) => {
  const { euiTheme } = useEuiTheme();
  const emptyLabelStyle = useMemo(
    () => ({
      color: euiTheme.colors.disabled,
    }),
    [euiTheme.colors.disabled]
  );
  const className = isChartEmbeddablesEnabled ? undefined : 'eui-textTruncate';
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="center"
      responsive={false}
      gutterSize="l"
      data-test-subj="donut-chart"
    >
      <StyledEuiFlexItem grow={isChartEmbeddablesEnabled}>
        <DonutTextWrapper
          $dataExists={dataExists}
          $isChartEmbeddablesEnabled={isChartEmbeddablesEnabled}
          alignItems="center"
          direction="column"
          gutterSize="none"
          justifyContent="center"
        >
          <EuiFlexItem>{title}</EuiFlexItem>
          <EuiFlexItem className={className}>
            <EuiToolTip content={label}>
              <EuiText
                className={className}
                size="s"
                style={dataExists ? undefined : emptyLabelStyle}
              >
                {label}
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        </DonutTextWrapper>
        {children}
      </StyledEuiFlexItem>
    </EuiFlexGroup>
  );
};
export const DonutChartWrapper = React.memo(DonutChartWrapperComponent);

export const DonutChart = ({
  data,
  fillColor,
  height = 90,
  isChartEmbeddablesEnabled,
  label,
  legendItems,
  onElementClick,
  title,
  totalCount,
}: DonutChartProps) => {
  const theme = useTheme();

  return (
    <DonutChartWrapper
      dataExists={data != null && data.length > 0}
      label={label}
      title={title}
      isChartEmbeddablesEnabled={isChartEmbeddablesEnabled}
    >
      <>
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

        {legendItems && legendItems?.length > 0 && (
          <EuiFlexItem>
            <DraggableLegend legendItems={legendItems} height={height} />
          </EuiFlexItem>
        )}
      </>
    </DonutChartWrapper>
  );
};
