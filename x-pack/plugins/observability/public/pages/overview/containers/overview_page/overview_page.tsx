/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { BoolQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import React, { useEffect, useMemo, useCallback, useState } from 'react';

import { observabilityFeatureId } from '../../../../../common';
import type { ObservabilityAppServices } from '../../../../application/types';
import {
  DataSections,
  LoadingObservability,
  HeaderActions,
  DataAssistantFlyout,
} from '../../components';
import { EmptySections } from '../../../../components/app/empty_sections';
import { ObservabilityHeaderMenu } from '../../../../components/app/header';
import { Resources } from '../../../../components/app/resources';
import { NewsFeed } from '../../../../components/app/news_feed';
import { SectionContainer } from '../../../../components/app/section';
import { ObservabilityStatusProgress } from '../../../../components/app/observability_status/observability_status_progress';
import { observabilityAlertFeatureIds, paths } from '../../../../config';
import { useBreadcrumbs } from '../../../../hooks/use_breadcrumbs';
import { useDatePickerContext } from '../../../../hooks/use_date_picker_context';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useGetUserCasesPermissions } from '../../../../hooks/use_get_user_cases_permissions';
import { useGuidedSetupProgress } from '../../../../hooks/use_guided_setup_progress';
import { useHasData } from '../../../../hooks/use_has_data';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { useTimeBuckets } from '../../../../hooks/use_time_buckets';
import { getNewsFeed } from '../../../../services/get_news_feed';
import { buildEsQuery } from '../../../../utils/build_es_query';
import { getAlertSummaryTimeRange } from '../../../../utils/alert_summary_widget';

import {
  ALERTS_PER_PAGE,
  ALERTS_TABLE_ID,
  DEFAULT_DATE_FORMAT,
  DEFAULT_INTERVAL,
} from './constants';
import { calculateBucketSize, useOverviewMetrics } from './helpers';

export function OverviewPage() {
  const {
    cases: {
      ui: { getCasesContext },
    },
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

  const CasesContext = getCasesContext();
  const userCasesPermissions = useGetUserCasesPermissions();

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

  const chartThemes = {
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
      }}
    >
      <ObservabilityHeaderMenu />

      <ObservabilityStatusProgress
        onDismissClick={() => setGuidedSetupTourVisible(true)}
        onViewDetailsClick={() => setIsDataAssistantFlyoutVisible(true)}
      />

      <EuiFlexGroup direction="column" gutterSize="s">
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
            <CasesContext
              owner={[observabilityFeatureId]}
              permissions={userCasesPermissions}
              features={{ alerts: { sync: false } }}
            >
              <AlertSummaryWidget
                featureIds={observabilityAlertFeatureIds}
                filter={esQuery}
                fullSize
                timeRange={alertSummaryTimeRange}
                chartThemes={chartThemes}
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
            </CasesContext>
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
