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
import { i18n } from '@kbn/i18n';
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
  showAxes: boolean;
}

export const SubChart: React.FC<SubChartProps> = ({
  index,
  color,
  category,
  percentage,
  height,
  data,
  width,
  showAxes,
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
      <EuiFlexItem style={{ position: 'relative' }}>
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
          {showAxes ? (
            <Axis
              id="bottom-axis"
              position="bottom"
              tickFormat={timeFormatter('YYYY-MM-DD HH:mm:ss')}
            />
          ) : null}
          <Axis
            id="left-axis"
            position="left"
            showGridLines
            tickFormat={(d) => (showAxes ? Number(d).toFixed(0) : '')}
            style={
              showAxes
                ? {}
                : {
                    tickLine: { visible: false },
                    tickLabel: { visible: false },
                    axisTitle: { visible: false },
                  }
            }
          />
        </Chart>
        {!showAxes ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              backgroundColor: `rgba(255, 255, 255, 0.75)`,
            }}
          >
            {i18n.translate('xpack.profiling.maxValue', {
              defaultMessage: 'Max: {max}',
              values: { max: Math.max(...data.map((value) => value.Count ?? 0)) },
            })}
          </div>
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
