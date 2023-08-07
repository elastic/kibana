/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiPanel } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { usePrevalence } from '../hooks/use_prevalence';
import { INSIGHTS_PREVALENCE_TEST_ID } from './test_ids';
import { InsightsSubSection } from './insights_subsection';
import { useRightPanelContext } from '../context';
import { PREVALENCE_TEXT, PREVALENCE_TITLE, VIEW_ALL } from './translations';
import { LeftPanelKey, LeftPanelInsightsTabPath } from '../../left';

/**
 * Prevalence section under Insights section, overview tab.
 * The component fetches the necessary data, then pass it down to the InsightsSubSection component for loading and error state,
 * and the SummaryPanel component for data rendering.
 */
export const PrevalenceOverview: FC = () => {
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
        scopeId,
      },
    });
  }, [eventId, openLeftPanel, indexName, scopeId]);

  const { empty, prevalenceRows } = usePrevalence({
    eventId,
    browserFields,
    dataFormattedForFieldBrowser,
    scopeId,
  });

  if (!eventId || !browserFields || !dataFormattedForFieldBrowser || empty) {
    return null;
  }

  return (
    <InsightsSubSection title={PREVALENCE_TITLE} data-test-subj={INSIGHTS_PREVALENCE_TEST_ID}>
      <EuiPanel hasShadow={false} hasBorder={true} paddingSize="s">
        <EuiFlexGroup direction="column" gutterSize="none">
          {prevalenceRows}
        </EuiFlexGroup>
      </EuiPanel>
      <EuiButtonEmpty
        onClick={goToCorrelationsTab}
        iconType="arrowStart"
        iconSide="left"
        size="s"
        data-test-subj={`${INSIGHTS_PREVALENCE_TEST_ID}ViewAllButton`}
      >
        {VIEW_ALL(PREVALENCE_TEXT)}
      </EuiButtonEmpty>
    </InsightsSubSection>
  );
};

PrevalenceOverview.displayName = 'PrevalenceOverview';
