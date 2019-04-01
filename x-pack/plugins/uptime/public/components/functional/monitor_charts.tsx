/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  getAxisId,
  getSpecId,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import {
  // @ts-ignore missing typings
  EuiAreaSeries,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore missing typings
  EuiLineSeries,
  EuiPanel,
  // @ts-ignore missing typings
  EuiSeriesChart,
  // @ts-ignore missing typings
  EuiSeriesChartUtils,
  // @ts-ignore missing typings
  EuiSpacer,
  // @ts-ignore missing typings
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { MonitorChart } from '../../../common/graphql/types';
import { convertMicrosecondsToMilliseconds as microsToMillis } from '../../lib/helper';

interface MonitorChartsProps {
  checkDomainLimits: number[];
  danger: string;
  durationDomainLimits: number[];
  monitorChartData: MonitorChart;
  primary: string;
  secondary: string;
}

export const MonitorCharts = ({
  checkDomainLimits,
  danger,
  durationDomainLimits,
  monitorChartData: { durationArea, durationLine, status },
  primary,
  secondary,
}: MonitorChartsProps) => {
  return (
    <Fragment>
      <EuiFlexGroup>
        <EuiFlexItem style={{ height: 400 }}>
          <EuiTitle size="xs">
            <h4>Monitor Duration ms</h4>
          </EuiTitle>
          <EuiPanel>
            <Chart renderer="canvas" className="uptime-monitor-chart">
              <Settings legendPosition={Position.Top} showLegend={true} />
              <Axis
                id={getAxisId('durationBottom')}
                position={Position.Bottom}
                tickFormat={timeFormatter('HH:mm')}
                showOverlappingTicks={true}
              />
              <Axis
                id={getAxisId('durationLeft')}
                position={Position.Left}
                tickFormat={d => Number(d).toFixed(0)}
                title="Duration ms"
              />
              <AreaSeries
                id={getSpecId('durationAreaSeries')}
                curve={CurveType.CURVE_BASIS}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={0}
                yAccessors={[1, 2]}
                seriesType="area"
                data={durationArea.map(({ x, yMin, yMax }) => [
                  x,
                  (yMin || 0) / 1000,
                  (yMax || 0) / 1000,
                ])}
                yScaleToDataExtent={false}
              />
              <LineSeries
                data={durationLine.map(({ x, y }) => [x, microsToMillis(y)])}
                id={getSpecId('Average')}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={0}
                yAccessors={[1]}
                yScaleToDataExtent={false}
              />
              {/* <BarSeries
              xScaleType={ScaleType.Linear}
              yScaleType={ScaleType.Log}
              xAccessor="x"
              yAccessors={['y']}
              stackAccessors={['x']}
              data={[
                { x: 1, y: 0, g: 'a' },
                { x: 1, y: 0, g: 'b' },
                { x: 2, y: 1, g: 'a' },
                { x: 2, y: 1, g: 'b' },
                { x: 3, y: 2, g: 'a' },
                { x: 3, y: 2, g: 'b' },
                { x: 4, y: 3, g: 'a' },
                { x: 4, y: 0, g: 'b' },
                { x: 5, y: 4, g: 'a' },
                { x: 5, y: 0.5, g: 'b' },
                { x: 6, y: 5, g: 'a' },
                { x: 6, y: 1, g: 'b' },
                { x: 7, y: 6, g: 'b' },
                { x: 8, y: 7, g: 'a' },
                { x: 8, y: 10, g: 'b' },
                { x: 9, y: 4, g: 'a' },
              ]}
            /> */}
            </Chart>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>Check status</h4>
          </EuiTitle>
          <EuiPanel>
            <Chart renderer="canvas">
              <Settings legendPosition={Position.Top} showLegend={true} />
              <Axis
                id={getAxisId('checksBottom')}
                position={Position.Bottom}
                tickFormat={timeFormatter('HH:mm')}
                showOverlappingTicks={true}
              />
              <Axis
                id={getAxisId('checksLeft')}
                position={Position.Left}
                tickFormat={d => Number(d).toFixed(0)}
              />
              <AreaSeries
                id={getSpecId('checkAreaSeries')}
                curve={CurveType.CURVE_BASIS}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={0}
                yAccessors={[1, 2]}
                seriesType="area"
                stackAccessors={['y']}
                data={status.map(({ x, up, down }) => [x, up || 0, down || 0])}
              />
            </Chart>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>
              <FormattedMessage
                id="xpack.uptime.monitorCharts.monitorDuration.titleLabel"
                defaultMessage="Monitor Duration ms"
                description="The 'ms' is an abbreviation for milliseconds."
              />
            </h4>
          </EuiTitle>
          <EuiPanel style={{ maxWidth: 520, maxHeight: 220 }}>
            <EuiSeriesChart
              margins={{ left: 60, right: 40, top: 10, bottom: 40 }}
              width={500}
              height={200}
              xType={EuiSeriesChartUtils.SCALE.TIME}
              xCrosshairFormat="YYYY-MM-DD hh:mmZ"
              yDomain={durationDomainLimits}
            >
              <EuiAreaSeries
                color={secondary}
                name={i18n.translate(
                  'xpack.uptime.monitorCharts.monitorDuration.series.durationRangeLabel',
                  {
                    defaultMessage: 'Duration range',
                  }
                )}
                data={durationArea.map(({ x, yMin, yMax }) => ({
                  x,
                  y0: microsToMillis(yMin),
                  y: microsToMillis(yMax),
                }))}
                curve="curveBasis"
              />
              <EuiLineSeries
                color={primary}
                name={i18n.translate(
                  'xpack.uptime.monitorCharts.monitorDuration.series.meanDurationLabel',
                  {
                    defaultMessage: 'Mean duration',
                  }
                )}
                data={durationLine.map(({ x, y }) => ({
                  x,
                  y: microsToMillis(y),
                }))}
              />
            </EuiSeriesChart>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>
              <FormattedMessage
                id="xpack.uptime.monitorCharts.checkStatus.title"
                defaultMessage="Check status"
              />
            </h4>
          </EuiTitle>
          <EuiPanel style={{ maxWidth: 520, maxHeight: 220 }}>
            <EuiSeriesChart
              margins={{ left: 60, right: 40, top: 10, bottom: 40 }}
              width={500}
              height={200}
              xType={EuiSeriesChartUtils.SCALE.TIME}
              xCrosshairFormat="YYYY-MM-DD hh:mmZ"
              stackBy="y"
              yDomain={checkDomainLimits}
            >
              <EuiAreaSeries
                name={i18n.translate('xpack.uptime.monitorCharts.checkStatus.series.upCountLabel', {
                  defaultMessage: 'Up count',
                })}
                data={status.map(({ x, up }) => ({ x, y: up }))}
                curve="curveBasis"
                color={primary}
              />
              <EuiAreaSeries
                name={i18n.translate(
                  'xpack.uptime.monitorCharts.checkStatus.series.downCountLabel',
                  {
                    defaultMessage: 'Down count',
                  }
                )}
                data={status.map(({ x, down }) => ({ x, y: down }))}
                color={danger}
              />
            </EuiSeriesChart>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
