/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { useShowRelatedAlertsBySession } from '../../shared/hooks/use_show_related_alerts_by_session';
import { RelatedAlertsBySession } from './related_alerts_by_session';
import { useShowRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_show_related_alerts_by_same_source_event';
import { RelatedAlertsBySameSourceEvent } from './related_alerts_by_same_source_event';
import { RelatedAlertsByAncestry } from './related_alerts_by_ancestry';
import { useShowRelatedAlertsByAncestry } from '../../shared/hooks/use_show_related_alerts_by_ancestry';
import { SuppressedAlerts } from './suppressed_alerts';
import { useShowSuppressedAlerts } from '../../shared/hooks/use_show_suppressed_alerts';
import { RelatedCases } from './related_cases';
import { useShowRelatedCases } from '../../shared/hooks/use_show_related_cases';
import { CORRELATIONS_TEST_ID } from './test_ids';
import { useRightPanelContext } from '../context';
import { DocumentDetailsLeftPanelKey, LeftPanelInsightsTab } from '../../left';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';

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
    isPreview,
  } = useRightPanelContext();
  const { openLeftPanel } = useExpandableFlyoutApi();

  const goToCorrelationsTab = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
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
    eventId,
    isPreview,
  });
  const { show: showSameSourceAlerts, originalEventId } = useShowRelatedAlertsBySameSourceEvent({
    getFieldsData,
  });
  const { show: showAlertsBySession, entityId } = useShowRelatedAlertsBySession({ getFieldsData });
  const showCases = useShowRelatedCases();
  const { show: showSuppressedAlerts, alertSuppressionCount } = useShowSuppressedAlerts({
    getFieldsData,
  });

  const canShowAtLeastOneInsight =
    showAlertsByAncestry ||
    showSameSourceAlerts ||
    showAlertsBySession ||
    showCases ||
    showSuppressedAlerts;

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.insights.correlations.overviewTitle"
            defaultMessage="Correlations"
          />
        ),
        link: {
          callback: goToCorrelationsTab,
          tooltip: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.correlations.overviewTooltip"
              defaultMessage="Show all correlations"
            />
          ),
        },
        iconType: 'arrowStart',
      }}
      data-test-subj={CORRELATIONS_TEST_ID}
    >
      {canShowAtLeastOneInsight ? (
        <EuiFlexGroup direction="column" gutterSize="none">
          {showSuppressedAlerts && (
            <SuppressedAlerts alertSuppressionCount={alertSuppressionCount} />
          )}
          {showCases && <RelatedCases eventId={eventId} />}
          {showSameSourceAlerts && originalEventId && (
            <RelatedAlertsBySameSourceEvent originalEventId={originalEventId} scopeId={scopeId} />
          )}
          {showAlertsBySession && entityId && (
            <RelatedAlertsBySession entityId={entityId} scopeId={scopeId} />
          )}
          {showAlertsByAncestry && documentId && indices && (
            <RelatedAlertsByAncestry documentId={documentId} indices={indices} scopeId={scopeId} />
          )}
        </EuiFlexGroup>
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.insights.correlations.noDataDescription"
          defaultMessage="No correlations data available."
        />
      )}
    </ExpandablePanel>
  );
};

CorrelationsOverview.displayName = 'CorrelationsOverview';
