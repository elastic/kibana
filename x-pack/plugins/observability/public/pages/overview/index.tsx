/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { useTrackPageview } from '../..';
import { Alert } from '../../../../alerts/common';
import { EmptySections } from '../../components/app/empty_sections';
import { WithHeaderLayout } from '../../components/app/layout/with_header';
import { NewsFeed } from '../../components/app/news_feed';
import { Resources } from '../../components/app/resources';
import { AlertsSection } from '../../components/app/section/alerts';
import { DatePicker } from '../../components/shared/date_picker';
import { useFetcher } from '../../hooks/use_fetcher';
import { useHasData } from '../../hooks/use_has_data';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTimeRange } from '../../hooks/use_time_range';
import { RouteParams } from '../../routes';
import { getNewsFeed } from '../../services/get_news_feed';
import { getBucketSize } from '../../utils/get_bucket_size';
import { DataSections } from './data_sections';
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
  useTrackPageview({ app: 'observability-overview', path: 'overview' });
  useTrackPageview({ app: 'observability-overview', path: 'overview', delay: 15000 });
  const { core } = usePluginContext();
  const theme = useContext(ThemeContext);

  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd } = useTimeRange();

  const relativeTime = { start: relativeStart, end: relativeEnd };
  const absoluteTime = { start: absoluteStart, end: absoluteEnd };

  const { data: newsFeed } = useFetcher(() => getNewsFeed({ core }), [core]);

  const { hasData, hasAnyData } = useHasData();

  if (hasAnyData === undefined) {
    return <LoadingObservability />;
  }

  const alerts = (hasData.alert?.hasData as Alert[]) || [];

  const { refreshInterval = 10000, refreshPaused = true } = routeParams.query;

  const bucketSize = calculateBucketSize({
    start: absoluteTime.start,
    end: absoluteTime.end,
  });

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
          {hasAnyData && <DataSections bucketSize={bucketSize?.intervalString!} />}

          <EmptySections />
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
