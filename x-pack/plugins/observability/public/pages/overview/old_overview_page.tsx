/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useRef, useCallback } from 'react';
import { observabilityFeatureId } from '../../../common';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { useTrackPageview } from '../..';
import { EmptySections } from '../../components/app/empty_sections';
import { ObservabilityHeaderMenu } from '../../components/app/header';
import { NewsFeed } from '../../components/app/news_feed';
import { Resources } from '../../components/app/resources';
import { DatePicker } from '../../components/shared/date_picker';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useFetcher } from '../../hooks/use_fetcher';
import { useHasData } from '../../hooks/use_has_data';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useAlertIndexNames } from '../../hooks/use_alert_index_names';
import { RouteParams } from '../../routes';
import { getNewsFeed } from '../../services/get_news_feed';
import { getBucketSize } from '../../utils/get_bucket_size';
import { getNoDataConfig } from '../../utils/no_data_config';
import { DataSections } from './data_sections';
import { LoadingObservability } from './loading_observability';
import { AlertsTableTGrid } from '../alerts/containers/alerts_table_t_grid/alerts_table_t_grid';
import { SectionContainer } from '../../components/app/section';
import { ObservabilityAppServices } from '../../application/types';
import { useGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';
import { paths } from '../../config';
import { useDatePickerContext } from '../../hooks/use_date_picker_context';
import { ObservabilityStatusProgress } from '../../components/app/observability_status/observability_status_progress';
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

  const indexNames = useAlertIndexNames();
  const { cases, docLinks, http } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate, config } = usePluginContext();

  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd, refreshInterval, refreshPaused } =
    useDatePickerContext();

  const { data: newsFeed } = useFetcher(() => getNewsFeed({ http }), [http]);

  const { hasAnyData, isAllRequestsComplete } = useHasData();
  const refetch = useRef<() => void>();

  const bucketSize = useMemo(
    () =>
      calculateBucketSize({
        start: absoluteStart,
        end: absoluteEnd,
      }),
    [absoluteStart, absoluteEnd]
  );

  const setRefetch = useCallback((ref) => {
    refetch.current = ref;
  }, []);

  const onTimeRangeRefresh = useCallback(() => {
    return refetch.current && refetch.current();
  }, []);

  const CasesContext = cases.ui.getCasesContext();
  const userPermissions = useGetUserCasesPermissions();

  if (hasAnyData === undefined) {
    return <LoadingObservability />;
  }

  const hasData = hasAnyData === true || (isAllRequestsComplete === false ? undefined : false);

  const noDataConfig = getNoDataConfig({
    hasData,
    basePath: http.basePath,
    docsLink: docLinks.links.observability.guide,
  });

  const alertsLink = config.unsafe.alertingExperience.enabled
    ? paths.observability.alerts
    : paths.management.rules;

  return (
    <ObservabilityPageTemplate
      noDataConfig={noDataConfig}
      pageHeader={
        hasData
          ? {
              pageTitle: overviewPageTitle,
              rightSideItems: [
                <DatePicker
                  rangeFrom={relativeStart}
                  rangeTo={relativeEnd}
                  refreshInterval={refreshInterval}
                  refreshPaused={refreshPaused}
                  onTimeRangeRefresh={onTimeRangeRefresh}
                />,
              ],
            }
          : undefined
      }
    >
      {hasData && (
        <>
          <ObservabilityHeaderMenu />
          <ObservabilityStatusProgress />
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <SectionContainer
                title={i18n.translate('xpack.observability.overview.alerts.title', {
                  defaultMessage: 'Alerts',
                })}
                hasError={false}
                appLink={{
                  href: alertsLink,
                  label: i18n.translate('xpack.observability.overview.alerts.appLink', {
                    defaultMessage: 'Show alerts',
                  }),
                }}
                showExperimentalBadge={true}
              >
                <CasesContext
                  owner={[observabilityFeatureId]}
                  userCanCrud={userPermissions?.crud ?? false}
                  features={{ alerts: { sync: false } }}
                >
                  <AlertsTableTGrid
                    setRefetch={setRefetch}
                    rangeFrom={relativeStart}
                    rangeTo={relativeEnd}
                    indexNames={indexNames}
                  />
                </CasesContext>
              </SectionContainer>
            </EuiFlexItem>
            <EuiFlexItem>
              {/* Data sections */}
              {hasAnyData && <DataSections bucketSize={bucketSize} />}
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
