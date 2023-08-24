/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { ALERT_SUPPRESSION_DOCS_COUNT } from '@kbn/rule-data-utils';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { useShowRelatedAlertsBySession } from '../../shared/hooks/use_show_related_alerts_by_session';
import { RelatedAlertsBySession } from './related_alerts_by_session';
import { useShowRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_show_related_alerts_by_same_source_event';
import { RelatedAlertsBySameSourceEvent } from './related_alerts_by_same_source_event';
import { RelatedAlertsByAncestry } from './related_alerts_by_ancestry';
import { useShowRelatedAlertsByAncestry } from '../../shared/hooks/use_show_related_alerts_by_ancestry';
import { RelatedCases } from './related_cases';
import { useShowRelatedCases } from '../../shared/hooks/use_show_related_cases';
import {
  INSIGHTS_CORRELATIONS_TEST_ID,
  INSIGHTS_CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID,
} from './test_ids';
import { useRightPanelContext } from '../context';
import { CORRELATIONS_ERROR, CORRELATIONS_TITLE } from './translations';
import { CORRELATIONS_SUPRESSED_ALERTS } from '../../shared/translations';
import { LeftPanelKey, LeftPanelInsightsTab } from '../../left';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';
import { InsightsSummaryRow } from './insights_summary_row';

const ICON = 'warning';
/**
 * Correlations section under Insights section, overview tab.
 * The component fetches the necessary data, then pass it down to the InsightsSubSection component for loading and error state,
 * and the SummaryPanel component for data rendering.
 */
export const CorrelationsOverview: React.FC = () => {
  const {
    dataAsNestedObject,
    dataFormattedForFieldBrowser,
    eventId,
    indexName,
    getFieldsData,
    scopeId,
  } = useRightPanelContext();
  const { openLeftPanel } = useExpandableFlyoutContext();

  const goToCorrelationsTab = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      path: {
        tab: LeftPanelInsightsTab,
        subTab: CORRELATIONS_TAB_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, openLeftPanel, indexName, scopeId]);

  const {
    show: showAlertsByAncestry,
    documentId,
    indices,
  } = useShowRelatedAlertsByAncestry({
    getFieldsData,
    dataAsNestedObject,
    dataFormattedForFieldBrowser,
  });
  const { show: showSameSourceAlerts, originalEventId } = useShowRelatedAlertsBySameSourceEvent({
    getFieldsData,
  });
  const { show: showAlertsBySession, entityId } = useShowRelatedAlertsBySession({ getFieldsData });
  const showCases = useShowRelatedCases();

  const alertSuppressionField = getFieldsData(ALERT_SUPPRESSION_DOCS_COUNT);
  const alertSuppressionCount = alertSuppressionField ? parseInt(alertSuppressionField[0], 10) : 0;

  const canShowAtLeastOneInsight =
    showAlertsByAncestry || showSameSourceAlerts || showAlertsBySession || showCases;

  return (
    <ExpandablePanel
      header={{
        title: CORRELATIONS_TITLE,
        callback: goToCorrelationsTab,
        iconType: 'arrowStart',
      }}
      data-test-subj={INSIGHTS_CORRELATIONS_TEST_ID}
    >
      {canShowAtLeastOneInsight ? (
        <EuiFlexGroup direction="column" gutterSize="none">
          {alertSuppressionField && (
            <InsightsSummaryRow
              loading={false}
              error={false}
              icon={ICON}
              value={alertSuppressionCount}
              text={CORRELATIONS_SUPRESSED_ALERTS(alertSuppressionCount)}
              data-test-subj={INSIGHTS_CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID}
              key={`correlation-row-supressed-alerts`}
            />
          )}
          {showAlertsByAncestry && documentId && indices && (
            <RelatedAlertsByAncestry documentId={documentId} indices={indices} scopeId={scopeId} />
          )}
          {showSameSourceAlerts && originalEventId && (
            <RelatedAlertsBySameSourceEvent originalEventId={originalEventId} scopeId={scopeId} />
          )}
          {showAlertsBySession && entityId && (
            <RelatedAlertsBySession entityId={entityId} scopeId={scopeId} />
          )}
          {showCases && <RelatedCases eventId={eventId} />}
        </EuiFlexGroup>
      ) : (
        <div data-test-subj={`${INSIGHTS_CORRELATIONS_TEST_ID}Error`}>{CORRELATIONS_ERROR}</div>
      )}
    </ExpandablePanel>
  );
};

CorrelationsOverview.displayName = 'CorrelationsOverview';
