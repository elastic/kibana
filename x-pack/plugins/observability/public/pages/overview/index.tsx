/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { EmptySection } from '../../components/app/empty_section';
import { WithHeaderLayout } from '../../components/app/layout/with_header';
import { NewsFeed } from '../../components/app/news_feed';
import { Resources } from '../../components/app/resources';
import { AlertsSection } from '../../components/app/section/alerts';
import { APMSection } from '../../components/app/section/apm';
import { LogsSection } from '../../components/app/section/logs';
import { MetricsSection } from '../../components/app/section/metrics';
import { UptimeSection } from '../../components/app/section/uptime';
import { DatePicker, TimePickerTime } from '../../components/shared/data_picker';
import { FETCH_STATUS, useFetcher } from '../../hooks/use_fetcher';
import { UI_SETTINGS, useKibanaUISettings } from '../../hooks/use_kibana_ui_settings';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTrackPageview } from '../../hooks/use_track_metric';
import { RouteParams } from '../../routes';
import { getNewsFeed } from '../../services/get_news_feed';
import { getObservabilityAlerts } from '../../services/get_observability_alerts';
import { getBucketSize } from '../../utils/get_bucket_size';
import { getEmptySections } from './empty_section';
import { LoadingObservability } from './loading_observability';
import { ObsvSharedContext } from '../../context/shared_data';

interface Props {
  routeParams: RouteParams<'/overview'>;
}

export function calculatetBucketSize({ start, end }: { start?: number; end?: number }) {
  if (start && end) {
    return getBucketSize({ start, end, minInterval: '60s' });
  }
}

export function OverviewPage({ routeParams }: Props) {
  const { core } = usePluginContext();

  const { sharedData } = useContext(ObsvSharedContext);

  const { hasAnyData, hasData } = sharedData ?? {};

  useTrackPageview({ app: 'observability', path: 'overview' });
  useTrackPageview({ app: 'observability', path: 'overview', delay: 15000 });

  const { data: alerts = [], status: alertStatus } = useFetcher(() => {
    return getObservabilityAlerts({ core });
  }, [core]);

  const { data: newsFeed } = useFetcher(() => getNewsFeed({ core }), [core]);

  const theme = useContext(ThemeContext);
  const { refreshInterval = 10000, refreshPaused = true } = routeParams.query;

  const timePickerTime = useKibanaUISettings<TimePickerTime>(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);

  const appEmptySections = getEmptySections({ core }).filter(({ id }) => {
    if (id === 'alert') {
      return alertStatus !== FETCH_STATUS.FAILURE && !alerts.length;
    }
    return hasData?.[id] === false;
  });

  return (
    <>
      {!hasAnyData && <LoadingObservability />}
      <WithHeaderLayout
        headerColor={theme.eui.euiColorEmptyShade}
        bodyColor={theme.eui.euiPageBackgroundColor}
        showAddData
        showGiveFeedback
      >
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <DatePicker
              rangeFrom={routeParams.query.rangeFrom ?? timePickerTime.from}
              rangeTo={routeParams.query.rangeTo ?? timePickerTime.to}
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
            {hasAnyData && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="column">
                  {hasData?.infra_logs !== false && (
                    <EuiFlexItem grow={false}>
                      <LogsSection />
                    </EuiFlexItem>
                  )}
                  {hasData?.infra_metrics !== false && (
                    <EuiFlexItem grow={false}>
                      <MetricsSection />
                    </EuiFlexItem>
                  )}
                  {hasData?.apm !== false && (
                    <EuiFlexItem grow={false}>
                      <APMSection />
                    </EuiFlexItem>
                  )}
                  {hasData?.uptime !== false && (
                    <EuiFlexItem grow={false}>
                      <UptimeSection />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
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

              {!!newsFeed?.items?.length && (
                <EuiFlexItem grow={false}>
                  <NewsFeed items={newsFeed.items.slice(0, 5)} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </WithHeaderLayout>
    </>
  );
}
