/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { useFetchThreatIntelligence } from '../hooks/use_fetch_threat_intelligence';
import { InsightsSummaryRow } from './insights_summary_row';
import { useDocumentDetailsContext } from '../../shared/context';
import {
  INSIGHTS_THREAT_INTELLIGENCE_ENRICHED_WITH_THREAT_INTELLIGENCE_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_THREAT_MATCHES_TEST_ID,
} from './test_ids';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { THREAT_INTELLIGENCE_TAB_ID } from '../../left/components/threat_intelligence_details';

const TITLE = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.right.insights.threatIntelligence.threatIntelligenceTitle"
    defaultMessage="Threat intelligence"
  />
);
const TOOLTIP = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.right.insights.threatIntelligence.threatIntelligenceTooltip"
    defaultMessage="Show all threat intelligence"
  />
);

/**
 * Threat intelligence section under Insights section, overview tab.
 * The component fetches the necessary data, then pass it down to the InsightsSubSection component for loading and error state,
 * and the SummaryPanel component for data rendering.
 */
export const ThreatIntelligenceOverview: FC = () => {
  const { eventId, indexName, scopeId, dataFormattedForFieldBrowser, isPreviewMode } =
    useDocumentDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();

  const goToThreatIntelligenceTab = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
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

  const link = useMemo(
    () =>
      !isPreviewMode
        ? {
            callback: goToThreatIntelligenceTab,
            tooltip: TOOLTIP,
          }
        : undefined,
    [isPreviewMode, goToThreatIntelligenceTab]
  );

  const threatMatchCountText = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.insights.threatIntelligence.threatMatchDescription"
        defaultMessage="Threat {count, plural, one {match} other {matches}} detected"
        values={{ count: threatMatchesCount }}
      />
    ),
    [threatMatchesCount]
  );

  const threatEnrichmentsCountText = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.insights.threatIntelligence.threatEnrichmentDescription"
        defaultMessage="{count, plural, one {Field} other {Fields}} enriched with threat intelligence"
        values={{ count: threatEnrichmentsCount }}
      />
    ),
    [threatEnrichmentsCount]
  );

  return (
    <ExpandablePanel
      header={{
        title: TITLE,
        link,
        iconType: !isPreviewMode ? 'arrowStart' : undefined,
      }}
      data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}
      content={{ loading }}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        data-test-subj={`${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}Container`}
      >
        <InsightsSummaryRow
          text={threatMatchCountText}
          value={threatMatchesCount}
          expandedSubTab={THREAT_INTELLIGENCE_TAB_ID}
          data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_THREAT_MATCHES_TEST_ID}
        />
        <InsightsSummaryRow
          text={threatEnrichmentsCountText}
          value={threatEnrichmentsCount}
          expandedSubTab={THREAT_INTELLIGENCE_TAB_ID}
          data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_ENRICHED_WITH_THREAT_INTELLIGENCE_TEST_ID}
        />
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};

ThreatIntelligenceOverview.displayName = 'ThreatIntelligenceOverview';
