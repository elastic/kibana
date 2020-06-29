/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import moment from 'moment';
import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeContext } from 'styled-components';
import { ObservabilityApp } from '../../../typings/common';
import { EmptySection } from '../../components/app/empty_section';
import { WithHeaderLayout } from '../../components/app/layout/with_header';
import { APMSection } from '../../components/app/section/apm';
import { LogsSection } from '../../components/app/section/logs';
import { MetricsSection } from '../../components/app/section/metrics';
import { UptimeSection } from '../../components/app/section/uptime';
import { DatePicker, TimePickerTime } from '../../components/shared/data_picker';
import { UI_SETTINGS, useKibanaUISettings } from '../../hooks/use_kibana_ui_settings';
import { RouteParams } from '../../routes';
import { getParsedDate } from '../../utils/date';
import { getBucketSize } from '../../utils/get_bucket_size';
import { appsSection } from '../home/section';

interface Props {
  routeParams: RouteParams<'/overview'>;
}

interface LocationState {
  hasData: Record<ObservabilityApp, boolean | undefined>;
}

export const Overview = ({ routeParams }: Props) => {
  const { state } = useLocation<LocationState>();

  const theme = useContext(ThemeContext);
  const timePickerTime = useKibanaUISettings<TimePickerTime>(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);

  const { rangeFrom = timePickerTime.from, rangeTo = timePickerTime.to } = routeParams.query;

  const startTime = getParsedDate(rangeFrom);
  const endTime = getParsedDate(rangeTo, { roundUp: true });
  const bucketSize =
    startTime && endTime
      ? getBucketSize({
          start: moment.utc(startTime).valueOf(),
          end: moment.utc(endTime).valueOf(),
          minInterval: 'auto',
        })
      : undefined;

  const emptySections = appsSection.filter(({ id }) => state && !state.hasData[id]);

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
              <LogsSection
                startTime={startTime}
                endTime={endTime}
                bucketSize={bucketSize?.intervalString}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <MetricsSection
                startTime={startTime}
                endTime={endTime}
                bucketSize={bucketSize?.intervalString}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <APMSection
                startTime={startTime}
                endTime={endTime}
                bucketSize={bucketSize?.intervalString}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <UptimeSection
                startTime={startTime}
                endTime={endTime}
                bucketSize={bucketSize?.intervalString}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={4}>Alert chart goes here</EuiFlexItem>
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
