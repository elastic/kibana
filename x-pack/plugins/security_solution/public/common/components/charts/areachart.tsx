/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  Axis,
  AreaSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  AreaSeriesStyle,
  RecursivePartial,
} from '@elastic/charts';

import { getOr, get, isNull, isNumber } from 'lodash/fp';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useThrottledResizeObserver } from '../utils';
import { ChartPlaceHolder } from './chart_place_holder';
import { useTimeZone } from '../../lib/kibana';
import {
  chartDefaultSettings,
  ChartSeriesConfigs,
  ChartSeriesData,
  getChartHeight,
  getChartWidth,
  WrappedByAutoSizer,
  useTheme,
  Wrapper,
} from './common';
import { VisualizationActions, HISTOGRAM_ACTIONS_BUTTON_CLASS } from '../visualization_actions';
import { VisualizationActionsProps } from '../visualization_actions/types';

import { HoverVisibilityContainer } from '../hover_visibility_container';

// custom series styles: https://ela.st/areachart-styling
const getSeriesLineStyle = (): RecursivePartial<AreaSeriesStyle> => {
  return {
    area: {
      opacity: 0.04,
      visible: true,
    },
    line: {
      strokeWidth: 1,
      visible: true,
    },
    point: {
      visible: false,
      radius: 0.2,
      strokeWidth: 1,
      opacity: 1,
    },
  };
};

const checkIfAllTheDataInTheSeriesAreValid = (series: unknown): series is ChartSeriesData =>
  !!get('value.length', series) &&
  get('value', series).every(
    ({ x, y }: { x: unknown; y: unknown }) => !isNull(x) && isNumber(y) && y > 0
  );

const checkIfAnyValidSeriesExist = (
  data: ChartSeriesData[] | null | undefined
): data is ChartSeriesData[] =>
  Array.isArray(data) && data.some(checkIfAllTheDataInTheSeriesAreValid);

const axisStyle = {
  tickLine: {
    visible: false,
  },
  tickLabel: {
    padding: 3,
  },
};

// https://ela.st/multi-areaseries
export const AreaChartBaseComponent = ({
  data,
  ...chartConfigs
}: {
  data: ChartSeriesData[];
  width: string | null | undefined;
  height: string | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
}) => {
  const theme = useTheme();
  const timeZone = useTimeZone();
  const xTickFormatter = get('configs.axis.xTickFormatter', chartConfigs);
  const yTickFormatter = get('configs.axis.yTickFormatter', chartConfigs);
  const xAxisId = `group-${data[0].key}-x`;
  const yAxisId = `group-${data[0].key}-y`;
  const settings = {
    ...chartDefaultSettings,
    theme,
    ...get('configs.settings', chartConfigs),
  };
  return chartConfigs.width && chartConfigs.height ? (
    <div style={{ height: chartConfigs.height, width: chartConfigs.width, position: 'relative' }}>
      <Chart>
        <Settings {...settings} />
        {data.map((series) => {
          const seriesKey = series.key;
          return checkIfAllTheDataInTheSeriesAreValid(series) ? (
            <AreaSeries
              id={seriesKey}
              key={seriesKey}
              name={series.key.replace('Histogram', '')}
              data={series.value || []}
              xScaleType={getOr(ScaleType.Linear, 'configs.series.xScaleType', chartConfigs)}
              yScaleType={getOr(ScaleType.Linear, 'configs.series.yScaleType', chartConfigs)}
              timeZone={timeZone}
              xAccessor="x"
              yAccessors={['y']}
              areaSeriesStyle={getSeriesLineStyle()}
              color={series.color ? series.color : undefined}
            />
          ) : null;
        })}

        <Axis
          id={xAxisId}
          position={Position.Bottom}
          showOverlappingTicks={false}
          tickFormat={xTickFormatter}
          style={axisStyle}
        />

        <Axis id={yAxisId} position={Position.Left} style={axisStyle} tickFormat={yTickFormatter} />
      </Chart>
    </div>
  ) : null;
};

AreaChartBaseComponent.displayName = 'AreaChartBaseComponent';

export const AreaChartBase = React.memo(AreaChartBaseComponent);

AreaChartBase.displayName = 'AreaChartBase';

interface AreaChartComponentProps {
  areaChart: ChartSeriesData[] | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
  visualizationActionsOptions?: VisualizationActionsProps;
}

export const AreaChartComponent: React.FC<AreaChartComponentProps> = ({
  areaChart,
  configs,
  visualizationActionsOptions,
}) => {
  const { ref: measureRef, width, height } = useThrottledResizeObserver();
  const customHeight = get('customHeight', configs);
  const customWidth = get('customWidth', configs);
  const chartHeight = getChartHeight(customHeight, height);
  const chartWidth = getChartWidth(customWidth, width);

  const isValidSeriesExist = useMemo(() => checkIfAnyValidSeriesExist(areaChart), [areaChart]);

  return (
    <Wrapper>
      <HoverVisibilityContainer targetClassNames={[HISTOGRAM_ACTIONS_BUTTON_CLASS]}>
        {isValidSeriesExist && areaChart && (
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem grow={true}>
              <WrappedByAutoSizer ref={measureRef} height={chartHeight}>
                <AreaChartBase
                  data={areaChart}
                  height={chartHeight}
                  width={chartWidth}
                  configs={configs}
                />
              </WrappedByAutoSizer>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {!isValidSeriesExist && (
          <ChartPlaceHolder height={chartHeight} width={chartWidth} data={areaChart} />
        )}
        {visualizationActionsOptions != null && (
          <VisualizationActions {...visualizationActionsOptions} className="viz-actions" />
        )}
      </HoverVisibilityContainer>
    </Wrapper>
  );
};

export const AreaChart = React.memo(AreaChartComponent);
