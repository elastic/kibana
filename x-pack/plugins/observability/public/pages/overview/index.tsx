/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import moment from 'moment';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { EmptySection } from '../../components/app/empty_section';
import { WithHeaderLayout } from '../../components/app/layout/with_header';
import { Resources } from '../../components/app/resources';
import { AlertsSection } from '../../components/app/section/alerts';
import { APMSection } from '../../components/app/section/apm';
import { LogsSection } from '../../components/app/section/logs';
import { MetricsSection } from '../../components/app/section/metrics';
import { UptimeSection } from '../../components/app/section/uptime';
import { DatePicker, TimePickerTime } from '../../components/shared/data_picker';
import { fetchHasData } from '../../data_handler';
import { FETCH_STATUS, useFetcher } from '../../hooks/use_fetcher';
import { UI_SETTINGS, useKibanaUISettings } from '../../hooks/use_kibana_ui_settings';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { RouteParams } from '../../routes';
import { getObservabilityAlerts } from '../../services/get_observability_alerts';
import { getParsedDate } from '../../utils/date';
import { getBucketSize } from '../../utils/get_bucket_size';
import { getEmptySections } from './empty_section';
import { LoadingObservability } from './loading_observability';

interface Props {
  routeParams: RouteParams<'/overview'>;
}

function calculatetBucketSize({ startTime, endTime }: { startTime?: string; endTime?: string }) {
  if (startTime && endTime) {
    return getBucketSize({
      start: moment.utc(startTime).valueOf(),
      end: moment.utc(endTime).valueOf(),
      minInterval: '60s',
    });
  }
}

export const OverviewPage = ({ routeParams }: Props) => {
  const { core } = usePluginContext();

  const { data: alerts = [], status: alertStatus } = useFetcher(() => {
    return getObservabilityAlerts({ core });
  }, []);

  const theme = useContext(ThemeContext);
  const timePickerTime = useKibanaUISettings<TimePickerTime>(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);

  const result = useFetcher(() => fetchHasData(), []);
  const hasData = result.data;

  if (!hasData) {
    return <LoadingObservability />;
  }

  const {
    rangeFrom = timePickerTime.from,
    rangeTo = timePickerTime.to,
    refreshInterval = 10000,
    refreshPaused = true,
  } = routeParams.query;

  const startTime = getParsedDate(rangeFrom);
  const endTime = getParsedDate(rangeTo, { roundUp: true });
  const bucketSize = calculatetBucketSize({ startTime, endTime });

  const appEmptySections = getEmptySections({ core }).filter(({ id }) => {
    if (id === 'alert') {
      return alertStatus !== FETCH_STATUS.FAILURE && !alerts.length;
    }
    return !hasData[id];
  });

  // Hides the data section when all 'hasData' is false or undefined
  const showDataSections = Object.values(hasData).some((hasPluginData) => hasPluginData);

  return (
    <WithHeaderLayout
      headerColor={theme.eui.euiColorEmptyShade}
      bodyColor={theme.eui.euiPageBackgroundColor}
      showAddData
      showGiveFeedback
    >
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <DatePicker
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            refreshInterval={refreshInterval}
            refreshPaused={refreshPaused}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule
        style={{
          width: 'auto', // full width
          margin: '24px -24px', // counteract page paddings
        }}
      />

      <EuiFlexGroup>
        <EuiFlexItem grow={6}>
          {/* Data sections */}
          {showDataSections && (
            <EuiFlexGroup direction="column">
              {hasData.infra_logs && (
                <EuiFlexItem grow={false}>
                  <LogsSection
                    startTime={startTime}
                    endTime={endTime}
                    bucketSize={bucketSize?.intervalString}
                  />
                </EuiFlexItem>
              )}
              {hasData.infra_metrics && (
                <EuiFlexItem grow={false}>
                  <MetricsSection
                    startTime={startTime}
                    endTime={endTime}
                    bucketSize={bucketSize?.intervalString}
                  />
                </EuiFlexItem>
              )}
              {hasData.apm && (
                <EuiFlexItem grow={false}>
                  <APMSection
                    startTime={startTime}
                    endTime={endTime}
                    bucketSize={bucketSize?.intervalString}
                  />
                </EuiFlexItem>
              )}
              {hasData.uptime && (
                <EuiFlexItem grow={false}>
                  <UptimeSection
                    startTime={startTime}
                    endTime={endTime}
                    bucketSize={bucketSize?.intervalString}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          )}

          {/* Empty sections */}
          {!!appEmptySections.length && (
            <EuiFlexItem>
              <EuiSpacer size="s" />
              <EuiFlexGrid
                columns={
                  // when more than 2 empty sections are available show them on 2 columns, otherwise 1
                  appEmptySections.length > 2 ? 2 : 1
                }
                gutterSize="s"
              >
                {appEmptySections.map((app) => {
                  return (
                    <EuiFlexItem
                      key={app.id}
                      style={{
                        border: `1px dashed ${theme.eui.euiBorderColor}`,
                        borderRadius: '4px',
                      }}
                    >
                      <EmptySection section={app} />
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGrid>
            </EuiFlexItem>
          )}
        </EuiFlexItem>

        {/* Alert section */}
        {!!alerts.length && (
          <EuiFlexItem grow={3}>
            <AlertsSection alerts={alerts} />
          </EuiFlexItem>
        )}

        {/* Resources section */}
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <Resources />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </WithHeaderLayout>
  );
};
