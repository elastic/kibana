/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { InsightsSummaryRow } from './insights_summary_row';
import { useCorrelations } from '../../shared/hooks/use_correlations';
import { INSIGHTS_CORRELATIONS_TEST_ID } from './test_ids';
import { useRightPanelContext } from '../context';
import { CORRELATIONS_TITLE } from './translations';
import { LeftPanelKey, LeftPanelInsightsTab } from '../../left';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';

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

  const { loading, error, data } = useCorrelations({
    eventId,
    dataAsNestedObject,
    dataFormattedForFieldBrowser,
    scopeId,
  });

  const correlationRows = useMemo(
    () =>
      data.map((d) => (
        <InsightsSummaryRow
          icon={d.icon}
          value={d.value}
          text={d.text}
          data-test-subj={INSIGHTS_CORRELATIONS_TEST_ID}
          key={`correlation-row-${d.text}`}
        />
      )),
    [data]
  );

  return (
    <ExpandablePanel
      header={{
        title: CORRELATIONS_TITLE,
        callback: goToCorrelationsTab,
        iconType: 'arrowStart',
      }}
      content={{ loading, error }}
      data-test-subj={INSIGHTS_CORRELATIONS_TEST_ID}
    >
      <EuiFlexGroup direction="column" gutterSize="none">
        {correlationRows}
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};

CorrelationsOverview.displayName = 'CorrelationsOverview';
