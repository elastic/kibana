/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { useTrackPageview, UXHasDataResponse } from '../..';
import { EmptySection } from '../../components/app/empty_section';
import { WithHeaderLayout } from '../../components/app/layout/with_header';
import { NewsFeed } from '../../components/app/news_feed';
import { Resources } from '../../components/app/resources';
import { AlertsSection } from '../../components/app/section/alerts';
import { DatePicker, TimePickerTime } from '../../components/shared/date_picker';
import { fetchHasData } from '../../data_handler';
import { FETCH_STATUS, useFetcher } from '../../hooks/use_fetcher';
import { UI_SETTINGS, useKibanaUISettings } from '../../hooks/use_kibana_ui_settings';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { RouteParams } from '../../routes';
import { getNewsFeed } from '../../services/get_news_feed';
import { getObservabilityAlerts } from '../../services/get_observability_alerts';
import { getAbsoluteTime } from '../../utils/date';
import { getBucketSize } from '../../utils/get_bucket_size';
import { DataSections } from './data_sections';
import { getEmptySections } from './empty_section';
import { LoadingObservability } from './loading_observability';

interface Props {
  routeParams: RouteParams<'/overview'>;
}

function calculateBucketSize({ start, end }: { start?: number; end?: number }) {
  if (start && end) {
    return getBucketSize({ start, end, minInterval: '60s' });
  }
}

export function OverviewPage({ routeParams }: Props) {
  const { core, plugins } = usePluginContext();

  // read time from state and update the url
  const timePickerSharedState = plugins.data.query.timefilter.timefilter.getTime();

  const timePickerDefaults = useKibanaUISettings<TimePickerTime>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );
  const relativeTime = {
    start: routeParams.query.rangeFrom || timePickerSharedState.from || timePickerDefaults.from,
    end: routeParams.query.rangeTo || timePickerSharedState.to || timePickerDefaults.to,
  };

  const absoluteTime = {
    start: getAbsoluteTime(relativeTime.start) as number,
    end: getAbsoluteTime(relativeTime.end, { roundUp: true }) as number,
  };

  useTrackPageview({ app: 'observability-overview', path: 'overview' });
  useTrackPageview({ app: 'observability-overview', path: 'overview', delay: 15000 });

  const { data: alerts = [], status: alertStatus } = useFetcher(() => {
    return getObservabilityAlerts({ core });
  }, [core]);

  const { data: newsFeed } = useFetcher(() => getNewsFeed({ core }), [core]);

  const theme = useContext(ThemeContext);

  const result = useFetcher(
    () => fetchHasData(absoluteTime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const hasData = result.data;

  if (!hasData) {
    return <LoadingObservability />;
  }

  const { refreshInterval = 10000, refreshPaused = true } = routeParams.query;

  const bucketSize = calculateBucketSize({
    start: absoluteTime.start,
    end: absoluteTime.end,
  });

  const appEmptySections = getEmptySections({ core }).filter(({ id }) => {
    if (id === 'alert') {
      return alertStatus !== FETCH_STATUS.FAILURE && !alerts.length;
    } else if (id === 'ux') {
      return !(hasData[id] as UXHasDataResponse).hasData;
    }
    return !hasData[id];
  });

  // Hides the data section when all 'hasData' is false or undefined
  const showDataSections = Object.values(hasData).some((hasPluginData) => hasPluginData);

  return (
    <WithHeaderLayout
      headerColor={theme.eui.euiColorEmptyShade}
      bodyColor={theme.eui.euiPageBackgroundColor}
      datePicker={
        <DatePicker
          rangeFrom={relativeTime.start}
          rangeTo={relativeTime.end}
          refreshInterval={refreshInterval}
          refreshPaused={refreshPaused}
        />
      }
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={6}>
          {/* Data sections */}
          {showDataSections && (
            <DataSections
              hasData={hasData}
              absoluteTime={absoluteTime}
              relativeTime={relativeTime}
              bucketSize={bucketSize?.intervalString!}
            />
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
  );
}
