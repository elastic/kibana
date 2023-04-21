/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useFetchThreatIntelligence } from '../hooks/use_fetch_threat_intelligence';
import { InsightsSubSection } from './insights_subsection';
import type { InsightsSummaryPanelData } from './insights_summary_panel';
import { InsightsSummaryPanel } from './insights_summary_panel';
import { useRightPanelContext } from '../context';
import { INSIGHTS_THREAT_INTELLIGENCE_TEST_ID } from './test_ids';
import {
  VIEW_ALL,
  THREAT_INTELLIGENCE_TITLE,
  THREAT_INTELLIGENCE_TEXT,
  THREAT_MATCH_DETECTED,
  THREAT_ENRICHMENT,
  THREAT_MATCHES_DETECTED,
  THREAT_ENRICHMENTS,
} from './translations';
import { LeftPanelKey, LeftPanelInsightsTabPath } from '../../left';

/**
 * Threat Intelligence section under Insights section, overview tab.
 * The component fetches the necessary data, then pass it down to the InsightsSubSection component for loading and error state,
 * and the SummaryPanel component for data rendering.
 */
export const ThreatIntelligenceOverview: React.FC = () => {
  const { eventId, indexName, dataFormattedForFieldBrowser } = useRightPanelContext();
  const { openLeftPanel } = useExpandableFlyoutContext();

  const goToThreatIntelligenceTab = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      path: LeftPanelInsightsTabPath,
      params: {
        id: eventId,
        indexName,
      },
    });
  }, [eventId, openLeftPanel, indexName]);

  const { loading, threatMatchesCount, threatEnrichmentsCount } = useFetchThreatIntelligence({
    dataFormattedForFieldBrowser,
  });

  const data: InsightsSummaryPanelData[] = [
    {
      icon: 'image',
      value: threatMatchesCount,
      text: threatMatchesCount <= 1 ? THREAT_MATCH_DETECTED : THREAT_MATCHES_DETECTED,
    },
    {
      icon: 'warning',
      value: threatEnrichmentsCount,
      text: threatMatchesCount <= 1 ? THREAT_ENRICHMENT : THREAT_ENRICHMENTS,
    },
  ];

  const error: boolean =
    !eventId ||
    !dataFormattedForFieldBrowser ||
    (threatMatchesCount === 0 && threatEnrichmentsCount === 0);

  return (
    <InsightsSubSection
      loading={loading}
      error={error}
      title={THREAT_INTELLIGENCE_TITLE}
      data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}
    >
      <InsightsSummaryPanel data={data} data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID} />
      <EuiButtonEmpty
        onClick={goToThreatIntelligenceTab}
        iconType="arrowStart"
        iconSide="left"
        size="s"
        data-test-subj={`${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}ViewAllButton`}
      >
        {VIEW_ALL(THREAT_INTELLIGENCE_TEXT)}
      </EuiButtonEmpty>
    </InsightsSubSection>
  );
};

ThreatIntelligenceOverview.displayName = 'ThreatIntelligenceOverview';
