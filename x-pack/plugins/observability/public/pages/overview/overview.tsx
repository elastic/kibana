/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { BoolQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useBreadcrumbs, useFetcher } from '@kbn/observability-shared-plugin/public';

import type { ObservabilityAppServices } from '../../application/types';
import { LoadingObservability } from '../../components/loading_observability';
import { HeaderActions } from './components/header_actions/header_actions';
import { DataAssistantFlyout } from './components/data_assistant_flyout';
import { EmptySections } from './components/sections/empty/empty_sections';
import { HeaderMenu } from './components/header_menu/header_menu';
import { Resources } from './components/resources';
import { NewsFeed } from './components/news_feed/news_feed';
import { ObservabilityStatusProgress } from './components/observability_status/observability_status_progress';
import { observabilityAlertFeatureIds } from '../../config/alert_feature_ids';
import { paths } from '../../config/paths';
import { useDatePickerContext } from '../../hooks/use_date_picker_context';
import { useGuidedSetupProgress } from '../../hooks/use_guided_setup_progress';
import { useHasData } from '../../hooks/use_has_data';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTimeBuckets } from '../../hooks/use_time_buckets';
import { getNewsFeed } from './components/news_feed/helpers/get_news_feed';
import { buildEsQuery } from '../../utils/build_es_query';
import { getAlertSummaryTimeRange } from '../../utils/alert_summary_widget';

import { DEFAULT_DATE_FORMAT, DEFAULT_INTERVAL } from '../../constants';
import { calculateBucketSize } from './helpers/calculate_bucket_size';
import { useOverviewMetrics } from './helpers/use_overview_metrics';
import { SectionContainer } from './components/sections/section_container';
import { DataSections } from './components/data_sections';

const ALERTS_PER_PAGE = 10;
const ALERTS_TABLE_ID = 'xpack.observability.overview.alert.table';

export function OverviewPage() {
  const {
    charts,
    http,
    triggersActionsUi: {
      alertsTableConfigurationRegistry,
      getAlertsStateTable: AlertsStateTable,
      getAlertSummaryWidget: AlertSummaryWidget,
    },
    kibanaVersion,
  } = useKibana<ObservabilityAppServices>().services;

  const { ObservabilityPageTemplate } = usePluginContext();

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
    },
  ]);

  const { data: newsFeed } = useFetcher(
    () => getNewsFeed({ http, kibanaVersion }),
    [http, kibanaVersion]
  );
  const { hasAnyData, isAllRequestsComplete } = useHasData();

  const { trackMetric } = useOverviewMetrics({ hasAnyData });

  const [isDataAssistantFlyoutVisible, setIsDataAssistantFlyoutVisible] = useState(false);

  const { isGuidedSetupProgressDismissed } = useGuidedSetupProgress();
  const [isGuidedSetupTourVisible, setGuidedSetupTourVisible] = useState(false);

  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd } = useDatePickerContext();

  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>(
    buildEsQuery({
      from: relativeStart,
      to: relativeEnd,
    })
  );

  const timeBuckets = useTimeBuckets();
  const bucketSize = useMemo(
    () =>
      calculateBucketSize({
        start: absoluteStart,
        end: absoluteEnd,
        timeBuckets,
      }),
    [absoluteStart, absoluteEnd, timeBuckets]
  );
  const alertSummaryTimeRange = useMemo(
    () =>
      getAlertSummaryTimeRange(
        {
          from: relativeStart,
          to: relativeEnd,
        },
        bucketSize?.intervalString || DEFAULT_INTERVAL,
        bucketSize?.dateFormat || DEFAULT_DATE_FORMAT
      ),
    [bucketSize, relativeEnd, relativeStart]
  );

  const chartProps = {
    theme: charts.theme.useChartsTheme(),
    baseTheme: charts.theme.useChartsBaseTheme(),
  };

  useEffect(() => {
    setEsQuery(
      buildEsQuery({
        from: relativeStart,
        to: relativeEnd,
      })
    );
  }, [relativeEnd, relativeStart]);

  const handleTimeRangeRefresh = useCallback(() => {
    setEsQuery(
      buildEsQuery({
        from: relativeStart,
        to: relativeEnd,
      })
    );
  }, [relativeEnd, relativeStart]);

  const handleCloseGuidedSetupTour = () => {
    setGuidedSetupTourVisible(false);
  };

  const handleGuidedSetupClick = useCallback(() => {
    if (isGuidedSetupProgressDismissed) {
      trackMetric({ metric: 'guided_setup_view_details_after_dismiss' });
    }

    handleCloseGuidedSetupTour();

    setIsDataAssistantFlyoutVisible(true);
  }, [trackMetric, isGuidedSetupProgressDismissed]);

  if (hasAnyData === undefined) {
    return <LoadingObservability />;
  }

  return (
    <ObservabilityPageTemplate
      isPageDataLoaded={isAllRequestsComplete}
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.overview.pageTitle', {
          defaultMessage: 'Overview',
        }),
        rightSideItems: [
          <HeaderActions
            showTour={isGuidedSetupTourVisible}
            onGuidedSetupClick={handleGuidedSetupClick}
            onTourDismiss={handleCloseGuidedSetupTour}
            onTimeRangeRefresh={handleTimeRangeRefresh}
          />,
        ],
        rightSideGroupProps: {
          responsive: true,
        },
        'data-test-subj': 'obltOverviewPageHeader',
      }}
    >
      <HeaderMenu />

      <ObservabilityStatusProgress
        onDismissClick={() => setGuidedSetupTourVisible(true)}
        onViewDetailsClick={() => setIsDataAssistantFlyoutVisible(true)}
      />

      <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="obltOverviewAlerts">
        <EuiFlexItem>
          <SectionContainer
            title={i18n.translate('xpack.observability.overview.alerts.title', {
              defaultMessage: 'Alerts',
            })}
            appLink={{
              href: paths.observability.alerts,
              label: i18n.translate('xpack.observability.overview.alerts.appLink', {
                defaultMessage: 'Show alerts',
              }),
            }}
            initialIsOpen={hasAnyData}
            hasError={false}
          >
            <AlertSummaryWidget
              chartProps={chartProps}
              featureIds={observabilityAlertFeatureIds}
              filter={esQuery}
              fullSize
              timeRange={alertSummaryTimeRange}
            />
            <AlertsStateTable
              alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
              configurationId={AlertConsumers.OBSERVABILITY}
              flyoutSize="s"
              featureIds={observabilityAlertFeatureIds}
              hideLazyLoader
              id={ALERTS_TABLE_ID}
              pageSize={ALERTS_PER_PAGE}
              query={esQuery}
              showExpandToDetails={false}
              showAlertStatusWithFlapping
            />
          </SectionContainer>
        </EuiFlexItem>
        <EuiFlexItem>
          {/* Data sections */}
          <DataSections bucketSize={bucketSize} />
          <EmptySections />
        </EuiFlexItem>
        <EuiSpacer size="s" />
      </EuiFlexGroup>

      <EuiHorizontalRule />

      <EuiFlexGroup>
        <EuiFlexItem>
          {/* Resources / What's New sections */}
          <EuiFlexGroup>
            <EuiFlexItem grow={4}>
              {!!newsFeed?.items?.length && <NewsFeed items={newsFeed.items.slice(0, 3)} />}
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <Resources />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isDataAssistantFlyoutVisible ? (
        <DataAssistantFlyout onClose={() => setIsDataAssistantFlyoutVisible(false)} />
      ) : null}
    </ObservabilityPageTemplate>
  );
}
