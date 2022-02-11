/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiPanel, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useTrackPageview } from '../..';
import { EmptySections } from '../../components/app/empty_sections';
import { ObservabilityHeaderMenu } from '../../components/app/header';
import { NewsFeed } from '../../components/app/news_feed';
import { Resources } from '../../components/app/resources';
import { AlertsSection } from '../../components/app/section/alerts';
import { DatePicker } from '../../components/shared/date_picker';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useFetcher } from '../../hooks/use_fetcher';
import { useHasData } from '../../hooks/use_has_data';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTimeRange } from '../../hooks/use_time_range';
import { RouteParams } from '../../routes';
import { getNewsFeed } from '../../services/get_news_feed';
import { getBucketSize } from '../../utils/get_bucket_size';
import { getNoDataConfig } from '../../utils/no_data_config';
import { DataSections } from './data_sections';
import { LoadingObservability } from './loading_observability';

interface Props {
  routeParams: RouteParams<'/overview'>;
}
export type BucketSize = ReturnType<typeof calculateBucketSize>;
function calculateBucketSize({ start, end }: { start?: number; end?: number }) {
  if (start && end) {
    return getBucketSize({ start, end, minInterval: '60s' });
  }
}

export function OverviewPage({ routeParams }: Props) {
  useTrackPageview({ app: 'observability-overview', path: 'overview' });
  useTrackPageview({ app: 'observability-overview', path: 'overview', delay: 15000 });
  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
    },
  ]);

  const { core, ObservabilityPageTemplate } = usePluginContext();

  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd } = useTimeRange();

  const relativeTime = { start: relativeStart, end: relativeEnd };
  const absoluteTime = { start: absoluteStart, end: absoluteEnd };

  const { data: newsFeed } = useFetcher(() => getNewsFeed({ core }), [core]);

  const { hasDataMap, hasAnyData, isAllRequestsComplete } = useHasData();

  const bucketSize = calculateBucketSize({
    start: absoluteTime.start,
    end: absoluteTime.end,
  });

  const bucketSizeValue = useMemo(() => {
    if (bucketSize?.bucketSize) {
      return {
        bucketSize: bucketSize.bucketSize,
        intervalString: bucketSize.intervalString,
      };
    }
  }, [bucketSize?.bucketSize, bucketSize?.intervalString]);

  if (hasAnyData === undefined) {
    return <LoadingObservability />;
  }

  const hasData = hasAnyData === true || (isAllRequestsComplete === false ? undefined : false);

  const noDataConfig = getNoDataConfig({
    hasData,
    basePath: core.http.basePath,
    docsLink: core.docLinks.links.observability.guide,
  });

  const { refreshInterval = 10000, refreshPaused = true } = routeParams.query;

  return (
    <ObservabilityPageTemplate
      noDataConfig={noDataConfig}
      pageHeader={
        hasData
          ? {
              pageTitle: overviewPageTitle,
              rightSideItems: [
                <DatePicker
                  rangeFrom={relativeTime.start}
                  rangeTo={relativeTime.end}
                  refreshInterval={refreshInterval}
                  refreshPaused={refreshPaused}
                />,
              ],
            }
          : undefined
      }
    >
      {hasData && (
        <>
          <ObservabilityHeaderMenu />
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="s">
                {hasDataMap?.alert?.hasData && (
                  <EuiFlexItem>
                    <EuiPanel color="subdued">
                      <AlertsSection />
                    </EuiPanel>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              {/* Data sections */}
              {hasAnyData && <DataSections bucketSize={bucketSizeValue} />}
              <EmptySections />
            </EuiFlexItem>
            <EuiSpacer size="s" />
          </EuiFlexGroup>
          <EuiHorizontalRule />
          <EuiFlexGroup>
            <EuiFlexItem>
              {/* Resources / What's New sections */}
              <EuiFlexGroup direction="row">
                <EuiFlexItem grow={4}>
                  {!!newsFeed?.items?.length && <NewsFeed items={newsFeed.items.slice(0, 3)} />}
                </EuiFlexItem>
                <EuiFlexItem grow={2}>
                  <Resources />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </ObservabilityPageTemplate>
  );
}

const overviewPageTitle = i18n.translate('xpack.observability.overview.pageTitle', {
  defaultMessage: 'Overview',
});
