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
import { ParsedSeverityBucket } from '../../../overview/components/alerts_by_status/types';

export const NO_LEGEND_DATA: LegendItem[] = [];

export interface DonutChartData {
  value: number;
  label: string;
  name: string;
  link?: string | null;
}

export interface DonutChartProps {
  showLegend?: boolean;
  data: ParsedSeverityBucket[];
  name: string;
  height: number;
  legendField?: string;
  link?: string | null;
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
  showLegend = true,
  data,
  name,
  link,
  height,
  legendField,
}: DonutChartProps) => {
  const theme = useTheme();

  const { colors, chartTheme } = useContext(ThemeContext);
  const sum = data.reduce((acc, curr) => acc + curr.value, 0);
  const isEmptyChart = sum === 0;

  const legendItems: LegendItem[] = useMemo(
    () =>
      data != null && legendField
        ? data.map((d, i) => ({
            color: colors[i],
            dataProviderId: escapeDataProviderId(`draggable-legend-item-${uuid.v4()}-${d.group}`),
            timelineId: undefined,
            field: legendField,
            value: d.key,
          }))
        : NO_LEGEND_DATA,
    [colors, data, legendField]
  );

  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" responsive={false} gutterSize="l">
      <StyledEuiFlexItem grow={false}>
        {data && data.length > 0 && (
          <StyledEuiFlexGroup
            direction="column"
            gutterSize="none"
            alignItems="center"
            justifyContent="center"
          >
            <EuiFlexItem>
              <strong>{sum}</strong>
            </EuiFlexItem>
            <EuiFlexItem className="eui-textTruncate">
              {isEmptyChart && (
                <EuiTextColor color="#ABB4C4" className="eui-textTruncate">
                  {name}
                </EuiTextColor>
              )}
              {!isEmptyChart && !link && (
                <EuiText className="eui-textTruncate" size="s">
                  {name}
                </EuiText>
              )}

              {!isEmptyChart && link && <EuiLink className="eui-textTruncate">{name}</EuiLink>}
            </EuiFlexItem>
          </StyledEuiFlexGroup>
        )}
        {isEmptyChart && <DonutChartEmpty size={height} />}
        {!isEmptyChart && (
          <Chart size={height}>
            <Settings theme={chartTheme.theme} baseTheme={theme} />
            <Partition
              id="spec_1"
              data={data}
              layout={PartitionLayout.sunburst}
              valueAccessor={(d: Datum) => d.value as number}
              layers={[
                {
                  groupByRollup: (d: Datum) => d.status,
                  shape: {
                    fillColor: () => '#fff',
                  },
                },
                {
                  groupByRollup: (d: Datum) => d.status,
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
      </StyledEuiFlexItem>
      {showLegend && legendItems && (
        <EuiFlexItem>
          <DraggableLegend legendItems={legendItems} height={height} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
