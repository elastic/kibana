/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  ScaleType,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { getFieldNameForTopNType, TopNType } from '../../common/stack_traces';
import { CountPerTime } from '../../common/topn';
import { useKibanaTimeZoneSetting } from '../hooks/use_kibana_timezone_setting';
import { useProfilingChartsTheme } from '../hooks/use_profiling_charts_theme';
import { useProfilingParams } from '../hooks/use_profiling_params';
import { useProfilingRouter } from '../hooks/use_profiling_router';
import { asPercentage } from '../utils/formatters/as_percentage';

export interface SubChartProps {
  index: number;
  color: string;
  height: number;
  width?: number;
  category: string;
  percentage: number;
  data: CountPerTime[];
}

export const SubChart: React.FC<SubChartProps> = ({
  index,
  color,
  category,
  percentage,
  height,
  data,
  width,
}) => {
  const theme = useEuiTheme();

  const profilingRouter = useProfilingRouter();

  const { path, query } = useProfilingParams('/stacktraces/{topNType}');

  const href = profilingRouter.link('/stacktraces/{topNType}', {
    path: {
      topNType: TopNType.Traces,
    },
    query: {
      ...query,
      kuery: `${getFieldNameForTopNType(path.topNType)}:"${category}"`,
    },
  });

  const timeZone = useKibanaTimeZoneSetting();

  const { chartsTheme, chartsBaseTheme } = useProfilingChartsTheme();

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiFlexGroup
          direction="row"
          gutterSize="m"
          alignItems="flexStart"
          style={{ overflowWrap: 'anywhere' }}
        >
          <EuiFlexItem grow={false}>
            <EuiBadge color={color}>
              <EuiText color={theme.euiTheme.colors.lightestShade} size="xs">
                {index}
              </EuiText>
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiLink href={href}>
              <EuiText size="s">{category}</EuiText>
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{asPercentage(percentage / 100, 2)}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer />
      <EuiFlexItem>
        <Chart size={{ height, width }}>
          <Settings
            showLegend={false}
            tooltip={{ showNullValues: false }}
            baseTheme={chartsBaseTheme}
            theme={chartsTheme}
          />
          <AreaSeries
            id={category}
            name={category}
            data={data}
            xAccessor={'Timestamp'}
            yAccessors={['Count']}
            xScaleType={ScaleType.Time}
            timeZone={timeZone}
            yScaleType={ScaleType.Linear}
            curve={CurveType.CURVE_STEP_AFTER}
            color={color}
          />
          <Axis
            id="bottom-axis"
            position="bottom"
            tickFormat={timeFormatter('YYYY-MM-DD HH:mm:ss')}
          />
          <Axis
            id="left-axis"
            position="left"
            showGridLines
            tickFormat={(d) => Number(d).toFixed(0)}
          />
        </Chart>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
