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
import { StackedBarChart } from '../../components/chart/stacked_bar';
import { logsData } from './logs.mock';
import { uptimeData } from './uptime.mock';

export const Overview = () => {
  const theme = useContext(ThemeContext);
  const [withAlert, setWithAlert] = useState(false);

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
              <StackedBarChart data={logsData} />
            </EuiFlexItem>
            <EuiFlexItem>
              <MetricsChart />
            </EuiFlexItem>
            <EuiFlexItem>
              <APMChart />
            </EuiFlexItem>
            <EuiFlexItem>
              <StackedBarChart data={uptimeData} />
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
