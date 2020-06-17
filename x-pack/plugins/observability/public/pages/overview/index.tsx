/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiDatePicker,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import moment from 'moment';
import React, { useContext, useState } from 'react';
import { ThemeContext } from 'styled-components';
import { isEmpty } from 'lodash';
import { APMChart } from '../../components/chart/apm';
import { ChartContainer } from '../../components/chart/container';
import { MetricsChart } from '../../components/chart/metrics';
import { StackedBarChart } from '../../components/chart/stacked_bar';
import { EmptySection } from '../../components/empty_section';
import { WithHeaderLayout } from '../../components/layout/with_header';
import { appsSection } from '../home/section';
import { getDataHandler } from '../../data_handler';
import { useFetcher } from '../../hooks/use_fetcher';

export const Overview = () => {
  const theme = useContext(ThemeContext);
  const [withAlert, setWithAlert] = useState(false);

  const { data: apmData } = useFetcher(() => {
    const dataHandler = getDataHandler('apm');
    if (dataHandler) {
      return dataHandler.fetchData({ startTime: '1', endTime: '2', bucketSize: '3' });
    }
  }, []);
  const { data: logsData } = useFetcher(() => {
    const dataHandler = getDataHandler('infra_logs');
    if (dataHandler) {
      return dataHandler.fetchData({ startTime: '1', endTime: '2', bucketSize: '3' });
    }
  }, []);
  const { data: metricsData } = useFetcher(() => {
    const dataHandler = getDataHandler('infra_metrics');
    if (dataHandler) {
      return dataHandler.fetchData({ startTime: '1', endTime: '2', bucketSize: '3' });
    }
  }, []);
  const { data: uptimeData } = useFetcher(() => {
    const dataHandler = getDataHandler('uptime');
    if (dataHandler) {
      return dataHandler.fetchData({ startTime: '1', endTime: '2', bucketSize: '3' });
    }
  }, []);

  const emptySections = appsSection.filter((app) => {
    switch (app.id) {
      case 'apm':
        return isEmpty(apmData);
      case 'infra_logs':
        return isEmpty(logsData);
      case 'infra_metrics':
        return isEmpty(metricsData);
      case 'uptime':
        return isEmpty(uptimeData);
      default:
        return true;
    }
  });

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
              <MetricsChart data={metricsData} />
            </EuiFlexItem>
            <EuiFlexItem>
              <APMChart data={apmData} />
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
        <EuiFlexGrid columns={2}>
          {emptySections.map((app) => {
            return (
              <EuiFlexItem key={app.id}>
                <EmptySection section={app} />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGrid>
      </EuiFlexItem>
    </WithHeaderLayout>
  );
};
