/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiTextColor } from '@elastic/eui';
import React, { useContext, useMemo } from 'react';

import { Chart, Datum, Partition, Settings, PartitionLayout } from '@elastic/charts';
import uuid from 'uuid';
import styled from 'styled-components';
import { ThemeContext } from './donut_theme_context';
import { useTheme } from './common';
import { DraggableLegend } from './draggable_legend';
import { LegendItem } from './draggable_legend_item';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { DonutChartEmpty } from './donutchart_empty';

export const NO_LEGEND_DATA: LegendItem[] = [];

interface DonutChartData {
  key: string;
  value: number;
}

export interface DonutChartProps {
  colors: Record<string, string>;
  data: DonutChartData[] | null | undefined;
  fillColor: (d: Datum) => string;
  height?: number;
  label: string;
  legendField?: string;
  link?: string | null;
  showLegend?: boolean;
  title: React.ReactElement | string | number | null;
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
  colors,
  data,
  fillColor,
  height = 90,
  label,
  legendField,
  link,
  showLegend = true,
  title,
}: DonutChartProps) => {
  const theme = useTheme();

  const { chartTheme } = useContext(ThemeContext);

  const legendItems: LegendItem[] = useMemo(
    () =>
      data != null && legendField
        ? data.map((d, i) => {
            return {
              color: colors[d.key],
              dataProviderId: escapeDataProviderId(`draggable-legend-item-${uuid.v4()}-${d.key}`),
              timelineId: undefined,
              field: legendField,
              value: d.key,
            };
          })
        : NO_LEGEND_DATA,
    [colors, data, legendField]
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
        {data == null ? (
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
               to make the one above thinner.
               */
                {
                  groupByRollup: (d: Datum) => {
                    return d.key;
                  },
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
      {showLegend && legendItems.length > 0 && (
        <EuiFlexItem>
          <DraggableLegend legendItems={legendItems} height={height} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
