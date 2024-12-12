/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_RULE_TYPE } from '@kbn/rule-data-utils';

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
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
import { useDocumentDetailsContext } from '../../shared/context';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';
import { useTimelineDataFilters } from '../../../../timelines/containers/use_timeline_data_filters';
import { isActiveTimeline } from '../../../../helpers';
import { useTourContext } from '../../../../common/components/guided_onboarding_tour';
import {
  AlertsCasesTourSteps,
  SecurityStepId,
} from '../../../../common/components/guided_onboarding_tour/tour_config';

/**
 * Correlations section under Insights section, overview tab.
 * The component fetches the necessary data, then pass it down to the InsightsSubSection component for loading and error state,
 * and the SummaryPanel component for data rendering.
 */
export const CorrelationsOverview: React.FC = () => {
  const {
    dataAsNestedObject,
    eventId,
    indexName,
    getFieldsData,
    scopeId,
    isPreview,
    isPreviewMode,
  } = useDocumentDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { isTourShown, activeStep } = useTourContext();

  const { selectedPatterns } = useTimelineDataFilters(isActiveTimeline(scopeId));

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

  useEffect(() => {
    if (isTourShown(SecurityStepId.alertsCases) && activeStep === AlertsCasesTourSteps.createCase) {
      goToCorrelationsTab();
    }
  }, [activeStep, goToCorrelationsTab, isTourShown]);

  const { show: showAlertsByAncestry, documentId } = useShowRelatedAlertsByAncestry({
    getFieldsData,
    dataAsNestedObject,
    eventId,
    isPreview,
  });
  const { show: showSameSourceAlerts, originalEventId } = useShowRelatedAlertsBySameSourceEvent({
    eventId,
    getFieldsData,
  });
  const { show: showAlertsBySession, entityId } = useShowRelatedAlertsBySession({ getFieldsData });
  const showCases = useShowRelatedCases({ getFieldsData });
  const { show: showSuppressedAlerts, alertSuppressionCount } = useShowSuppressedAlerts({
    getFieldsData,
  });

  const canShowAtLeastOneInsight =
    showAlertsByAncestry ||
    showSameSourceAlerts ||
    showAlertsBySession ||
    showCases ||
    showSuppressedAlerts;

  const ruleType = get(dataAsNestedObject, ALERT_RULE_TYPE)?.[0] as Type | undefined;

  const link = useMemo(
    () =>
      !isPreviewMode
        ? {
            callback: goToCorrelationsTab,
            tooltip: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.insights.correlations.overviewTooltip"
                defaultMessage="Show all correlations"
              />
            ),
          }
        : undefined,
    [isPreviewMode, goToCorrelationsTab]
  );

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.insights.correlations.overviewTitle"
            defaultMessage="Correlations"
          />
        ),
        link,
        iconType: !isPreviewMode ? 'arrowStart' : undefined,
      }}
      data-test-subj={CORRELATIONS_TEST_ID}
    >
      {canShowAtLeastOneInsight ? (
        <EuiFlexGroup direction="column" gutterSize="s">
          {showSuppressedAlerts && (
            <SuppressedAlerts alertSuppressionCount={alertSuppressionCount} ruleType={ruleType} />
          )}
          {showCases && <RelatedCases eventId={eventId} />}
          {showSameSourceAlerts && (
            <RelatedAlertsBySameSourceEvent originalEventId={originalEventId} scopeId={scopeId} />
          )}
          {showAlertsBySession && entityId && (
            <RelatedAlertsBySession entityId={entityId} scopeId={scopeId} />
          )}
          {showAlertsByAncestry && (
            <RelatedAlertsByAncestry
              documentId={documentId}
              indices={selectedPatterns}
              scopeId={scopeId}
            />
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
