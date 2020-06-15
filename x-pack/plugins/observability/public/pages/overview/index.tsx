/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiDatePicker, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiSwitch } from '@elastic/eui';
import moment from 'moment';
import React, { useContext, useState } from 'react';
import { ThemeContext } from 'styled-components';
import { APMChart } from '../../components/chart/apm';
import { ChartContainer } from '../../components/chart/container';
import { WithHeaderLayout } from '../../components/layout/with_header';
import { appsSection } from '../home/section';
import { ContinueJourney } from './continue_journey';
import { MetricsChart } from '../../components/chart/metrics';

export const Overview = () => {
  const theme = useContext(ThemeContext);
  const [withAlert, setWithAlert] = useState(false);

  // const barSeriesColorAccessor = ({ specId, yAccessor, splitAccessors }: any) => {
  //   if (splitAccessors.get('group') === 'error') {
  //     return 'lightgray';
  //   }
  //   return 'red';
  // };
  // const barSeriesColorAccessor2 = ({ specId, yAccessor, splitAccessors }: any) => {
  //   if (splitAccessors.get('group') === 'error') {
  //     return '#CA8EAE';
  //   }
  //   return '#9170B8';
  // };

  return (
    <WithHeaderLayout
      headerColor={theme.eui.euiColorEmptyShade}
      bodyColor={theme.eui.euiPageBackgroundColor}
    >
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiDatePicker selected={moment()} onChange={() => {}} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiSwitch
        label="With alert data?"
        checked={withAlert}
        onChange={(e) => setWithAlert((currState) => !currState)}
      />
      <EuiSpacer />
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={6}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              {/* <ChartContainer title="Logs">
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
              </ChartContainer> */}
            </EuiFlexItem>
            <EuiFlexItem>
              <MetricsChart />
            </EuiFlexItem>
            <EuiFlexItem>
              <APMChart />
            </EuiFlexItem>
            <EuiFlexItem>
              {/* <ChartContainer title="Uptime">
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
              </ChartContainer> */}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {withAlert && (
          <EuiFlexItem grow={4}>
            <ChartContainer title="alert">chart goes here</ChartContainer>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexItem>
        <ContinueJourney apps={appsSection} />
      </EuiFlexItem>
    </WithHeaderLayout>
  );
};
