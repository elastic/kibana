/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  timeFormatter,
  niceTimeFormatByDay,
  Settings,
  niceTimeFormatter,
  DARK_THEME,
  LIGHT_THEME,
  LineSeries,
  AreaSeries,
} from '@elastic/charts';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import React, { useContext, useState } from 'react';
import { ThemeContext } from 'styled-components';
import numeral from '@elastic/numeral';
import { groupBy } from 'lodash';
import { ChartContainer } from '../../components/chart/container';
import { WithHeaderLayout } from '../../components/layout/with_header';
import { appsSection } from '../home/section';
import { ContinueJourney } from './continue_journey';
import { series } from './logs.data';
import { barData } from './uptime.data';
import { apmData } from './apm.data';

export const Overview = () => {
  const theme = useContext(ThemeContext);
  const [withAlert, setWithAlert] = useState(false);

  // const start = series[0].time;
  // const end = series[series.length - 1].time;
  // const formatter = niceTimeFormatter([start, end]);

  // const startUptime = barData[0].x;
  // const endUptime = barData[barData.length - 1].x;
  // const formatterUptime = niceTimeFormatter([startUptime, endUptime]);

  const { transaction: transactions, error: errors } = groupBy(apmData, (d) => d.group);

  const startAPM = transactions[0].time;
  const endAPM = transactions[transactions.length - 1].time;
  const formatterAPM = niceTimeFormatter([startAPM, endAPM]);

  const barSeriesColorAccessor = ({ specId, yAccessor, splitAccessors }: any) => {
    if (splitAccessors.get('group') === 'error') {
      return 'lightgray';
    }
    return 'red';
  };
  const barSeriesColorAccessor2 = ({ specId, yAccessor, splitAccessors }: any) => {
    if (splitAccessors.get('group') === 'error') {
      return '#CA8EAE';
    }
    return '#9170B8';
  };

  return (
    <WithHeaderLayout
      headerColor={theme.eui.euiColorEmptyShade}
      bodyColor={theme.eui.euiPageBackgroundColor}
    >
      <EuiSwitch
        label="With alert data?"
        checked={withAlert}
        onChange={(e) => setWithAlert((currState) => !currState)}
      />
      <EuiSpacer />
      <EuiFlexGrid columns={withAlert ? 2 : 1}>
        <EuiFlexItem>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <ChartContainer title="Logs">
                <Chart>
                  <Settings
                    onBrushEnd={({ x }) => {
                      console.log('#### Logs', x);
                    }}
                    theme={theme.darkMode ? DARK_THEME : LIGHT_THEME}
                    showLegend
                    legendPosition="bottom"
                    xDomain={{ min: startAPM, max: endAPM }}
                  />
                  <Axis
                    id="bottom"
                    position={Position.Bottom}
                    showOverlappingTicks={false}
                    showOverlappingLabels={false}
                    tickFormat={formatterAPM}
                  />
                  <Axis
                    showGridLines
                    id="left2"
                    position={Position.Left}
                    tickFormat={(d: any) => numeral(d).format('0a')}
                  />

                  <BarSeries
                    id="averageValues"
                    xScaleType="time"
                    yScaleType="linear"
                    xAccessor={'time'}
                    yAccessors={['value']}
                    splitSeriesAccessors={['group']}
                    stackAccessors={['time']}
                    data={apmData}
                  />
                </Chart>
              </ChartContainer>
            </EuiFlexItem>
            <EuiFlexItem>
              <ChartContainer title="Metrics">
                <Chart>
                  <Settings
                    onBrushEnd={({ x }) => {
                      console.log('#### Metrics', x);
                    }}
                    theme={theme.darkMode ? DARK_THEME : LIGHT_THEME}
                    showLegend
                    legendPosition="bottom"
                    xDomain={{ min: startAPM, max: endAPM }}
                  />
                  <Axis
                    id="bottom"
                    position={Position.Bottom}
                    showOverlappingTicks={false}
                    showOverlappingLabels={false}
                    tickFormat={formatterAPM}
                  />
                  <Axis
                    showGridLines
                    id="left2"
                    position={Position.Left}
                    tickFormat={(d: any) => numeral(d).format('0a')}
                  />
                  <AreaSeries
                    id="averageValues"
                    xScaleType="time"
                    yScaleType="linear"
                    xAccessor={'time'}
                    yAccessors={['value']}
                    splitSeriesAccessors={['group']}
                    stackAccessors={['time']}
                    data={apmData}
                    color={barSeriesColorAccessor2}
                  />
                </Chart>
              </ChartContainer>
            </EuiFlexItem>
            <EuiFlexItem>
              <ChartContainer title="APM">
                <Chart>
                  <Settings
                    onBrushEnd={({ x }) => {
                      console.log('#### APM', x);
                    }}
                    theme={theme.darkMode ? DARK_THEME : LIGHT_THEME}
                    showLegend={true}
                    legendPosition="bottom"
                  />
                  <BarSeries
                    id="transactions"
                    name="Transactions"
                    data={transactions}
                    xScaleType="time"
                    xAccessor={'time'}
                    yAccessors={['value']}
                    color="blue"
                    groupId="transactions"
                  />
                  <LineSeries
                    id="errors"
                    name="Errors"
                    data={errors}
                    xScaleType="time"
                    xAccessor={'time'}
                    yAccessors={['value']}
                    color="gold"
                    groupId="errors"
                  />
                  <Axis
                    id="bottom-axis"
                    position="bottom"
                    tickFormat={formatterAPM}
                    showGridLines
                  />
                  <Axis
                    id="right"
                    position={Position.Right}
                    tickFormat={(d) => `${Number(d).toFixed(0)} %`}
                    groupId="errors"
                  />
                  <Axis
                    id="left-axis"
                    position="left"
                    showGridLines
                    groupId="transactions"
                    tickFormat={(d) => numeral(d).format('0a')}
                  />
                </Chart>
              </ChartContainer>
            </EuiFlexItem>
            <EuiFlexItem>
              <ChartContainer title="Uptime">
                <Chart>
                  <Settings
                    onBrushEnd={({ x }) => {
                      console.log('#### Uptime', x);
                    }}
                    theme={theme.darkMode ? DARK_THEME : LIGHT_THEME}
                    showLegend
                    legendPosition="bottom"
                    xDomain={{ min: startAPM, max: endAPM }}
                  />
                  <Axis
                    id="bottom"
                    position={Position.Bottom}
                    showOverlappingTicks={false}
                    showOverlappingLabels={false}
                    tickFormat={formatterAPM}
                  />
                  <Axis
                    showGridLines
                    id="left2"
                    position={Position.Left}
                    tickFormat={(d: any) => numeral(d).format('0a')}
                  />

                  <BarSeries
                    id="averageValues"
                    xScaleType="time"
                    yScaleType="linear"
                    xAccessor={'time'}
                    yAccessors={['value']}
                    splitSeriesAccessors={['group']}
                    stackAccessors={['time']}
                    data={apmData}
                    color={barSeriesColorAccessor}
                  />
                </Chart>
              </ChartContainer>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {withAlert && (
          <EuiFlexItem>
            <ChartContainer title="alert">
              <EuiPanel>chart goes here</EuiPanel>
            </ChartContainer>
          </EuiFlexItem>
        )}
      </EuiFlexGrid>

      <EuiSpacer />

      <EuiFlexItem>
        <ContinueJourney apps={appsSection} />
      </EuiFlexItem>
    </WithHeaderLayout>
  );
};
