/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { useFetchThreatIntelligence } from '../hooks/use_fetch_threat_intelligence';
import { InsightsSummaryRow } from './insights_summary_row';
import { useRightPanelContext } from '../context';
import { INSIGHTS_THREAT_INTELLIGENCE_TEST_ID } from './test_ids';
import {
  THREAT_INTELLIGENCE_TITLE,
  THREAT_MATCH_DETECTED,
  THREAT_ENRICHMENT,
  THREAT_MATCHES_DETECTED,
  THREAT_ENRICHMENTS,
} from './translations';
import { LeftPanelKey, LeftPanelInsightsTab } from '../../left';
import { THREAT_INTELLIGENCE_TAB_ID } from '../../left/components/threat_intelligence_details';

/**
 * Threat Intelligence section under Insights section, overview tab.
 * The component fetches the necessary data, then pass it down to the InsightsSubSection component for loading and error state,
 * and the SummaryPanel component for data rendering.
 */
export const ThreatIntelligenceOverview: FC = () => {
  const { eventId, indexName, scopeId, dataFormattedForFieldBrowser } = useRightPanelContext();
  const { openLeftPanel } = useExpandableFlyoutContext();

  const goToThreatIntelligenceTab = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      path: {
        tab: LeftPanelInsightsTab,
        subTab: THREAT_INTELLIGENCE_TAB_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, openLeftPanel, indexName, scopeId]);

  const {
    loading: threatIntelLoading,
    error: threatIntelError,
    threatMatchesCount,
    threatEnrichmentsCount,
  } = useFetchThreatIntelligence({
    dataFormattedForFieldBrowser,
  });

  const error: boolean = !eventId || !dataFormattedForFieldBrowser || threatIntelError;

  return (
    <ExpandablePanel
      header={{
        title: THREAT_INTELLIGENCE_TITLE,
        callback: goToThreatIntelligenceTab,
        iconType: 'arrowStart',
      }}
      data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        data-test-subj={`${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}Container`}
      >
        <InsightsSummaryRow
          loading={threatIntelLoading}
          error={error}
          icon={'warning'}
          value={threatMatchesCount}
          text={threatMatchesCount <= 1 ? THREAT_MATCH_DETECTED : THREAT_MATCHES_DETECTED}
          data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}
        />
        <InsightsSummaryRow
          loading={threatIntelLoading}
          error={error}
          icon={'warning'}
          value={threatEnrichmentsCount}
          text={threatEnrichmentsCount <= 1 ? THREAT_ENRICHMENT : THREAT_ENRICHMENTS}
          data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}
        />
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};

ThreatIntelligenceOverview.displayName = 'ThreatIntelligenceOverview';
