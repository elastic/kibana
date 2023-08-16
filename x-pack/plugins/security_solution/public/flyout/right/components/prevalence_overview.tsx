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
import { usePrevalenceHighlightedFields } from '../../shared/hooks/use_prevalence_highlighted_fields';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { usePrevalence } from '../hooks/use_prevalence';
import { INSIGHTS_PREVALENCE_TEST_ID } from './test_ids';
import { useRightPanelContext } from '../context';
import { PREVALENCE_NO_DATA, PREVALENCE_ROW_UNCOMMON, PREVALENCE_TITLE } from './translations';
import { LeftPanelKey, LeftPanelInsightsTab } from '../../left';
import { PREVALENCE_TAB_ID } from '../../left/components/prevalence_details';
import { InsightsSummaryRow } from './insights_summary_row';

const DEFAULT_FROM = 'now-30d';
const DEFAULT_TO = 'now';

export interface PrevalenceOverviewSummaryRow {
  field: string;
  value: string;
}

/**
 * Prevalence section under Insights section, overview tab.
 * The component fetches the necessary data at once. The loading and error states are handled by the ExpandablePanel component.
 */
export const PrevalenceOverview: FC = () => {
  const {
    eventId,
    indexName,
    browserFields,
    dataFormattedForFieldBrowser,
    scopeId,
    investigationFields,
  } = useRightPanelContext();
  const { openLeftPanel } = useExpandableFlyoutContext();

  const goToCorrelationsTab = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      path: {
        tab: LeftPanelInsightsTab,
        subTab: PREVALENCE_TAB_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, openLeftPanel, indexName, scopeId]);

  const highlightedFields = usePrevalenceHighlightedFields({
    eventId,
    scopeId,
    browserFields,
    dataFormattedForFieldBrowser,
    investigationFields,
  });

  const { loading, error, data } = usePrevalence({
    highlightedFields,
    interval: {
      from: DEFAULT_FROM,
      to: DEFAULT_TO,
    },
  });

  if (!eventId || !browserFields || !dataFormattedForFieldBrowser) {
    return null;
  }

  return (
    <ExpandablePanel
      header={{
        title: PREVALENCE_TITLE,
        callback: goToCorrelationsTab,
        iconType: 'arrowStart',
      }}
      content={{ loading, error }}
      data-test-subj={INSIGHTS_PREVALENCE_TEST_ID}
    >
      <EuiFlexGroup direction="column" gutterSize="none">
        {data.length > 0 ? (
          data.map((d) => (
            <InsightsSummaryRow
              icon={'warning'}
              text={`${d.field}, ${d.value} ${PREVALENCE_ROW_UNCOMMON}`}
              data-test-subj={`${INSIGHTS_PREVALENCE_TEST_ID}${d.field}`}
            />
          ))
        ) : (
          <div data-test-subj={`${INSIGHTS_PREVALENCE_TEST_ID}Error`}>{PREVALENCE_NO_DATA}</div>
        )}
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};

//

PrevalenceOverview.displayName = 'PrevalenceOverview';
