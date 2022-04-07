/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiTextColor } from '@elastic/eui';
import React, { useContext } from 'react';

import { Chart, Datum, Partition, Settings, PartitionLayout } from '@elastic/charts';
import styled from 'styled-components';
import { ThemeContext } from './donut_theme_context';
import { useTheme } from './common';
import { DraggableLegend } from './draggable_legend';
import { LegendItem } from './draggable_legend_item';
import { DonutChartEmpty } from './donutchart_empty';

export const NO_LEGEND_DATA: LegendItem[] = [];

interface DonutChartData {
  key: string;
  value: number;
}

export interface DonutChartProps {
  data: DonutChartData[] | null | undefined;
  fillColor: (d: Datum) => string;
  height?: number;
  label: string;
  legendItems?: LegendItem[] | null | undefined;
  link?: string | null;
  title: React.ReactElement | string | number | null;
  totalCount: number | null | undefined;
}

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  top: 35%;
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
  link,
  title,
  totalCount,
  legendItems,
}: DonutChartProps) => {
  const theme = useTheme();

  const { chartTheme } = useContext(ThemeContext);

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="center"
      responsive={false}
      gutterSize="l"
      data-test-subj="donut-chart"
    >
      <StyledEuiFlexItem grow={false}>
        <StyledEuiFlexGroup
          direction="column"
          gutterSize="none"
          alignItems="center"
          justifyContent="center"
        >
          <EuiFlexItem>{title}</EuiFlexItem>
          <EuiFlexItem className="eui-textTruncate">
            {!data && (
              <EuiTextColor color="#ABB4C4" className="eui-textTruncate">
                {label}
              </EuiTextColor>
            )}
            {data && !link && (
              <EuiText className="eui-textTruncate" size="s">
                {label}
              </EuiText>
            )}

            {data && link && <EuiLink className="eui-textTruncate">{label}</EuiLink>}
          </EuiFlexItem>
        </StyledEuiFlexGroup>
        {data == null || totalCount == null || totalCount === 0 ? (
          <DonutChartEmpty size={height} />
        ) : (
          <Chart size={height}>
            <Settings theme={chartTheme.theme} baseTheme={theme} />
            <Partition
              id="donut-chart"
              data={data}
              layout={PartitionLayout.sunburst}
              valueAccessor={(d: Datum) => d.value as number}
              layers={[
                {
                  groupByRollup: (d: Datum) => d.group,
                  shape: {
                    fillColor: () => '#fff',
                  },
                },
                {
                  groupByRollup: (d: Datum) => d.group,
                  shape: {
                    fillColor: () => '#fff',
                  },
                },
                /* The layers above are for styling purpose,
               to make the ring thinner.
               */
                {
                  groupByRollup: (d: Datum) => d.key,
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
