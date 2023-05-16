/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useCorrelations } from '../hooks/use_correlations';
import { INSIGHTS_CORRELATIONS_TEST_ID } from './test_ids';
import { InsightsSubSection } from './insights_subsection';
import { InsightsSummaryPanel } from './insights_summary_panel';
import { useRightPanelContext } from '../context';
import { CORRELATIONS_TEXT, CORRELATIONS_TITLE, VIEW_ALL } from './translations';
import { LeftPanelKey, LeftPanelInsightsTabPath } from '../../left';

/**
 * Correlations section under Insights section, overview tab.
 * The component fetches the necessary data, then pass it down to the InsightsSubSection component for loading and error state,
 * and the SummaryPanel component for data rendering.
 */
export const CorrelationsOverview: React.FC = () => {
  const { eventId, indexName, dataAsNestedObject, dataFormattedForFieldBrowser, scopeId } =
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

  const { loading, error, data } = useCorrelations({
    eventId,
    dataAsNestedObject,
    dataFormattedForFieldBrowser,
    scopeId,
  });

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
