/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useFetchRelatedAlertsBySameSourceEvent } from '../hooks/use_fetch_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySameSourceEvent } from '../hooks/use_show_related_alerts_by_same_source_event';
import { useFetchRelatedAlertsBySession } from '../hooks/use_fetch_related_alerts_by_session';
import { useShowRelatedAlertsBySession } from '../hooks/use_show_related_alerts_by_session';
import { useFetchRelatedAlertsByAncestry } from '../hooks/use_fetch_related_alerts_by_ancestry';
import { useShowRelatedAlertsByAncestry } from '../hooks/use_show_related_alerts_by_ancestry';
import { useShowRelatedCases } from '../hooks/use_show_related_cases';
import { useFetchRelatedCases } from '../hooks/use_fetch_related_cases';
import { INSIGHTS_CORRELATIONS_TEST_ID } from './test_ids';
import { InsightsSubSection } from './insights_subsection';
import type { InsightsSummaryPanelData } from './insights_summary_panel';
import { InsightsSummaryPanel } from './insights_summary_panel';
import { useRightPanelContext } from '../context';
import {
  CORRELATIONS_ANCESTRY_ALERT,
  CORRELATIONS_ANCESTRY_ALERTS,
  CORRELATIONS_RELATED_CASE,
  CORRELATIONS_RELATED_CASES,
  CORRELATIONS_SAME_SESSION_ALERT,
  CORRELATIONS_SAME_SESSION_ALERTS,
  CORRELATIONS_SAME_SOURCE_EVENT_ALERT,
  CORRELATIONS_SAME_SOURCE_EVENT_ALERTS,
  CORRELATIONS_TEXT,
  CORRELATIONS_TITLE,
  VIEW_ALL,
} from './translations';
import { LeftPanelKey, LeftPanelInsightsTabPath } from '../../left';

/**
 * Correlations section under Insights section, overview tab.
 * The component fetches the necessary data, then pass it down to the InsightsSubSection component for loading and error state,
 * and the SummaryPanel component for data rendering.
 */
export const CorrelationsOverview: React.FC = () => {
  const { eventId, indexName, browserFields, dataFormattedForFieldBrowser, scopeId } =
    useRightPanelContext();
  const { openLeftPanel } = useExpandableFlyoutContext();

  const goToCorrelationsTab = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      path: LeftPanelInsightsTabPath,
      params: {
        id: eventId,
        indexName,
      },
    });
  }, [eventId, openLeftPanel, indexName]);

  const data: InsightsSummaryPanelData[] = [];

  // cases
  const showCases = useShowRelatedCases();
  const {
    loading: casesLoading,
    error: casesError,
    dataCount: casesCount,
  } = useFetchRelatedCases({ eventId });
  if (showCases && !casesLoading && !casesError) {
    data.push({
      icon: 'warning',
      value: casesCount,
      text: casesCount <= 1 ? CORRELATIONS_RELATED_CASE : CORRELATIONS_RELATED_CASES,
    });
  }

  // alerts by ancestry
  const showAlertsByAncestry = useShowRelatedAlertsByAncestry({ dataFormattedForFieldBrowser });
  const {
    loading: ancestryAlertsLoading,
    error: ancestryAlertsError,
    dataCount: ancestryAlertsCount,
  } = useFetchRelatedAlertsByAncestry({
    browserFields,
    dataFormattedForFieldBrowser,
    scopeId,
  });
  if (showAlertsByAncestry && !ancestryAlertsLoading && !ancestryAlertsError) {
    data.push({
      icon: 'warning',
      value: ancestryAlertsCount,
      text: ancestryAlertsCount <= 1 ? CORRELATIONS_ANCESTRY_ALERT : CORRELATIONS_ANCESTRY_ALERTS,
    });
  }

  // alerts related to same source event
  const showSameSourceAlerts = useShowRelatedAlertsBySameSourceEvent({
    dataFormattedForFieldBrowser,
  });
  const {
    loading: sameSourceAlertsLoading,
    error: sameSourceAlertsError,
    dataCount: sameSourceAlertsCount,
  } = useFetchRelatedAlertsBySameSourceEvent({
    dataFormattedForFieldBrowser,
    scopeId,
  });
  if (showSameSourceAlerts && !sameSourceAlertsLoading && !sameSourceAlertsError) {
    data.push({
      icon: 'warning',
      value: sameSourceAlertsCount,
      text:
        sameSourceAlertsCount <= 1
          ? CORRELATIONS_SAME_SOURCE_EVENT_ALERT
          : CORRELATIONS_SAME_SOURCE_EVENT_ALERTS,
    });
  }

  // alerts related by session
  const showAlertsBySession = useShowRelatedAlertsBySession({ dataFormattedForFieldBrowser });
  const {
    loading: alertsBySessionLoading,
    error: alertsBySessionError,
    dataCount: alertsBySessionCount,
  } = useFetchRelatedAlertsBySession({
    dataFormattedForFieldBrowser,
    scopeId,
  });
  if (showAlertsBySession && !alertsBySessionLoading && !alertsBySessionError) {
    data.push({
      icon: 'warning',
      value: alertsBySessionCount,
      text:
        alertsBySessionCount <= 1
          ? CORRELATIONS_SAME_SESSION_ALERT
          : CORRELATIONS_SAME_SESSION_ALERTS,
    });
  }

  const loading =
    casesLoading || ancestryAlertsLoading || alertsBySessionLoading || sameSourceAlertsLoading;

  const error =
    data.length === 0 ||
    (!showCases && !showAlertsByAncestry && !showAlertsBySession && !showSameSourceAlerts) ||
    (casesError && ancestryAlertsError && alertsBySessionError && sameSourceAlertsError);

  return (
    <InsightsSubSection
      loading={loading}
      error={error}
      title={CORRELATIONS_TITLE}
      data-test-subj={INSIGHTS_CORRELATIONS_TEST_ID}
    >
      <InsightsSummaryPanel data={data} data-test-subj={INSIGHTS_CORRELATIONS_TEST_ID} />
      <EuiButtonEmpty
        onClick={goToCorrelationsTab}
        iconType="arrowStart"
        iconSide="left"
        size="s"
        data-test-subj={`${INSIGHTS_CORRELATIONS_TEST_ID}ViewAllButton`}
      >
        {VIEW_ALL(CORRELATIONS_TEXT)}
      </EuiButtonEmpty>
    </InsightsSubSection>
  );
};

CorrelationsOverview.displayName = 'CorrelationsOverview';
