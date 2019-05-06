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
  CustomSeriesColorsMap,
} from '@elastic/charts';
import DateMath from '@elastic/datemath';
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
import React, { Fragment } from 'react';
import { MonitorChart } from '../../../common/graphql/types';
import { convertMicrosecondsToMilliseconds as microsToMillis } from '../../lib/helper';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { monitorChartsQuery } from '../../queries';

interface MonitorChartsQueryResult {
  monitorChartsData?: MonitorChart;
}

interface MonitorChartsProps {
  danger: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  mean: string;
  range: string;
  success: string;
}

type Props = MonitorChartsProps & UptimeGraphQLQueryProps<MonitorChartsQueryResult>;

export const MonitorChartsComponent = (props: Props) => {
  const { danger, data, dateRangeStart, dateRangeEnd, mean, range, success } = props;
  if (data && data.monitorChartsData) {
    const absoluteStart = DateMath.parse(dateRangeStart);
    const absoluteEnd = DateMath.parse(dateRangeEnd);
    console.log(absoluteStart.valueOf());
    console.log(absoluteEnd.valueOf());
    const {
      monitorChartsData: {
        durationArea,
        durationLine,
        status,
        // durationMaxValue,
        // statusMaxCount,
      },
    } = data;

    // const durationMax = microsToMillis(durationMaxValue);
    // These limits provide domain sizes for the charts
    // const checkDomainLimits = [0, statusMaxCount];
    // const durationDomainLimits = [0, durationMax ? durationMax : 0];
    const upString = i18n.translate('xpack.uptime.monitorCharts.checkStatus.series.upCountLabel', {
      defaultMessage: 'Up count',
    });
    const downString = i18n.translate(
      'xpack.uptime.monitorCharts.checkStatus.series.downCountLabel',
      {
        defaultMessage: 'Down count',
      }
    );

    const durationColors: CustomSeriesColorsMap = new Map();
    const checkareaseriesspecid = getSpecId('Up');
    durationColors.set(
      {
        colorValues: [],
        specId: checkareaseriesspecid,
      },
      success
    );
    const durationDown: CustomSeriesColorsMap = new Map();
    const checkdownseriesspecid = getSpecId('Down');
    durationDown.set(
      {
        colorValues: [],
        specId: checkdownseriesspecid,
      },
      danger
    );
    console.log();

    return (
      <Fragment>
        <EuiFlexGroup>
          <EuiFlexItem style={{ height: 400 }}>
            <EuiTitle size="xs">
              <h4>Monitor Duration ms</h4>
            </EuiTitle>
            <EuiPanel>
              <Chart className={'story-chart'}>
                <Axis
                  id={getAxisId('bottom')}
                  title={'timestamp per 1 minute'}
                  position={Position.Bottom}
                  showOverlappingTicks={true}
                  tickFormat={timeFormatter('MM-dd HH:mm')}
                />
                <Axis
                  domain={{ min: 0 }}
                  id={getAxisId('left')}
                  title="Duration ms"
                  position={Position.Left}
                  tickFormat={d => Number(d).toFixed(2)}
                />

                <AreaSeries
                  id={getSpecId('area')}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor={'x'}
                  yAccessors={['Max']}
                  y0Accessors={['Min']}
                  data={durationArea.map(({ x, yMin, yMax }) => {
                    const v = {
                      x,
                      Min: microsToMillis(yMin),
                      Max: microsToMillis(yMax),
                    };
                    console.log(v);
                    return v;
                  })}
                  yScaleToDataExtent={false}
                  curve={CurveType.CURVE_MONOTONE_X}
                />

                <LineSeries
                  id={getSpecId('average')}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor={0}
                  yAccessors={[1]}
                  data={durationLine.map(({ x, y }) => [x || 0, microsToMillis(y)])}
                  yScaleToDataExtent={true}
                  curve={CurveType.CURVE_MONOTONE_X}
                />
              </Chart>
              {/* <Chart renderer="canvas" className="uptime-monitor-chart">
                <Settings
                  domain={{ min: absoluteStart.valueOf(), max: absoluteEnd.valueOf() }}
                  legendPosition={Position.Top}
                  showLegend={true}
                />
                <Axis
                  id={getAxisId('durationBottom')}
                  position={Position.Bottom}
                  tickFormat={timeFormatter('HH:mm')}
                  title="Timestamp per 1 minute"
                  showOverlappingTicks={true}
                />
                <Axis
                  domain={{ min: 0 }}
                  id={getAxisId('durationLeft')}
                  position={Position.Left}
                  tickFormat={d => Number(d).toFixed(0)}
                  title="Duration ms"
                />
                {
                  // @ts-ignore
                  <AreaSeries
                    id={getSpecId('durationAreaSeries')}
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor="x"
                    yAccessors={['Max']}
                    y0Accessors={['Min']}
                    data={durationArea.map(({ x, yMin, yMax }) => ({
                      x,
                      Min: microsToMillis(yMin || 0),
                      Max: microsToMillis(yMax || 0),
                    }))}
                    yScaleToDataExtent={true}
                    curve={CurveType.CURVE_MONOTONE_X}
                  />
                }
                <LineSeries
                  data={durationLine.map(({ x, y }) => [x || 0, microsToMillis(y)])}
                  id={getSpecId('Average')}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor={0}
                  yAccessors={[1]}
                  yScaleToDataExtent={true}
                />
              </Chart> */}
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>Check status</h4>
            </EuiTitle>
            <EuiPanel>
              <Chart renderer="canvas">
                <Settings
                  domain={{ min: absoluteStart.valueOf(), max: absoluteEnd.valueOf() }}
                  legendPosition={Position.Top}
                  showLegend={true}
                />
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
                  customSeriesColors={durationColors}
                  id={checkareaseriesspecid}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor="x"
                  yAccessors={[upString]}
                  seriesType="area"
                  stackAccessors={['x']}
                  data={status.map(({ x, up }) => ({
                    x,
                    [upString]: up || 0,
                  }))}
                />
                <AreaSeries
                  customSeriesColors={durationDown}
                  id={checkdownseriesspecid}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor="x"
                  yAccessors={[downString]}
                  seriesType="area"
                  stackAccessors={['x']}
                  data={status.map(({ x, down }) => ({
                    x,
                    [downString]: down || 0,
                  }))}
                />
              </Chart>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
        {/* <EuiFlexGroup>
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
                  color={mean}
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
                  color={success}
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
                  name={i18n.translate(
                    'xpack.uptime.monitorCharts.checkStatus.series.upCountLabel',
                    {
                      defaultMessage: 'Up count',
                    }
                  )}
                  data={status.map(({ x, up }) => ({ x, y: up }))}
                  curve="curveBasis"
                  color={success}
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
        </EuiFlexGroup> */}
      </Fragment>
    );
  }
  return (
    <Fragment>
      {i18n.translate('xpack.uptime.monitorCharts.loadingMessage', {
        defaultMessage: 'Loading…',
      })}
    </Fragment>
  );
};

export const MonitorCharts = withUptimeGraphQL<MonitorChartsQueryResult, MonitorChartsProps>(
  MonitorChartsComponent,
  monitorChartsQuery
);
