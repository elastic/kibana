/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useContext, useState } from 'react';
import { ThemeContext } from 'styled-components';
import { EuiFlexGrid } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';
import { ChartContainer } from '../../components/chart/container';
import { WithHeaderLayout } from '../../components/layout/with_header';
import { ContinueJourney } from './continue_journey';
import { appsSection } from '../home/section';

export const Overview = () => {
  const theme = useContext(ThemeContext);
  const [withAlert, setWithAlert] = useState(true);

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
                <EuiPanel>chart goes here</EuiPanel>
              </ChartContainer>
            </EuiFlexItem>
            <EuiFlexItem>
              <ChartContainer title="Metrics">
                <EuiPanel>chart goes here</EuiPanel>
              </ChartContainer>
            </EuiFlexItem>
            <EuiFlexItem>
              <ChartContainer title="APM">
                <EuiPanel>chart goes here</EuiPanel>
              </ChartContainer>
            </EuiFlexItem>
            <EuiFlexItem>
              <ChartContainer title="Uptime">
                <EuiPanel>chart goes here</EuiPanel>
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
