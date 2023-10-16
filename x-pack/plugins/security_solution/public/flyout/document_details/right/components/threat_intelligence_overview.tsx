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
import { FormattedMessage } from '@kbn/i18n-react';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { useFetchThreatIntelligence } from '../hooks/use_fetch_threat_intelligence';
import { InsightsSummaryRow } from './insights_summary_row';
import { useRightPanelContext } from '../context';
import { INSIGHTS_THREAT_INTELLIGENCE_TEST_ID } from './test_ids';
import { LeftPanelKey, LeftPanelInsightsTab } from '../../left';
import { THREAT_INTELLIGENCE_TAB_ID } from '../../left/components/threat_intelligence_details';

/**
 * Threat intelligence section under Insights section, overview tab.
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

  const { loading, threatMatchesCount, threatEnrichmentsCount } = useFetchThreatIntelligence({
    dataFormattedForFieldBrowser,
  });

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.insights.threatIntelligence.threatIntelligenceTitle"
            defaultMessage="Threat intelligence"
          />
        ),
        link: {
          callback: goToThreatIntelligenceTab,
          tooltip: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.threatIntelligence.threatIntelligenceTooltip"
              defaultMessage="Show all threat intelligence"
            />
          ),
        },
        iconType: 'arrowStart',
      }}
      data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}
      content={{ loading }}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        data-test-subj={`${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}Container`}
      >
        <InsightsSummaryRow
          icon={'warning'}
          value={threatMatchesCount}
          text={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.threatIntelligence.threatMatchDescription"
              defaultMessage="threat {count, plural, one {match} other {matches}} detected"
              values={{ count: threatMatchesCount }}
            />
          }
          data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}
        />
        <InsightsSummaryRow
          icon={'warning'}
          value={threatEnrichmentsCount}
          text={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.threatIntelligence.threatEnrichmentDescription"
              defaultMessage="{count, plural, one {field} other {fields}} enriched with threat intelligence"
              values={{ count: threatEnrichmentsCount }}
            />
          }
          data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}
        />
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};

ThreatIntelligenceOverview.displayName = 'ThreatIntelligenceOverview';
