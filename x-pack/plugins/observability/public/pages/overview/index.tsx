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
import { DatePicker, TimePickerTime } from '../../components/shared/data_picker';
import { useQueryParams } from '../../hooks/use_query_params';
import { getParsedDate } from '../../utils/date';
import { useKibanaUISettings, UI_SETTINGS } from '../../hooks/use_kibana_ui_settings';
import { RouteParams } from '../../routes';

interface Props {
  routeParams?: RouteParams<'/overview'>;
}

export const Overview = ({ routeParams }: Props) => {
  console.log('### caue: Overview -> routeParams', routeParams?.params?.query);
  const theme = useContext(ThemeContext);
  const timePickerTime = useKibanaUISettings<TimePickerTime>(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);

  const { rangeFrom = timePickerTime.from, rangeTo = timePickerTime.to } = useQueryParams<any>();

  const { data = [] } = useFetcher(() => {
    const startTime = getParsedDate(rangeFrom);
    const endTime = getParsedDate(rangeTo);
    if (startTime && endTime) {
      const params = { startTime, endTime, bucketSize: '3' };
      const apmHandler = getDataHandler('apm')?.fetchData(params);
      const logsHandler = getDataHandler('infra_logs')?.fetchData(params);
      const metricsHandler = getDataHandler('infra_metrics')?.fetchData(params);
      const uptimeHandler = getDataHandler('uptime')?.fetchData(params);

      return Promise.all([apmHandler, logsHandler, metricsHandler, uptimeHandler]);
    }
  }, [rangeFrom, rangeTo]);

  const [apmData, logsData, metricsData, uptimeData] = data;

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
          <DatePicker rangeFrom={rangeFrom} rangeTo={rangeTo} />
        </EuiFlexItem>
      </EuiFlexGroup>
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
        <EuiFlexItem grow={4}>
          <ChartContainer title="alert">chart goes here</ChartContainer>
        </EuiFlexItem>
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
