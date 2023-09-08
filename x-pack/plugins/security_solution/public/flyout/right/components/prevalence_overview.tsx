/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { usePrevalence } from '../../shared/hooks/use_prevalence';
import { INSIGHTS_PREVALENCE_TEST_ID } from './test_ids';
import { useRightPanelContext } from '../context';
import { PREVALENCE_NO_DATA, PREVALENCE_ROW_UNCOMMON, PREVALENCE_TITLE } from './translations';
import { LeftPanelKey, LeftPanelInsightsTab } from '../../left';
import { PREVALENCE_TAB_ID } from '../../left/components/prevalence_details';
import { InsightsSummaryRow } from './insights_summary_row';

const PERCENTAGE_THRESHOLD = 0.1; // we show the prevalence if its value is below 10%
const DEFAULT_FROM = 'now-30d';
const DEFAULT_TO = 'now';

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

  const { loading, error, data } = usePrevalence({
    dataFormattedForFieldBrowser,
    investigationFields,
    interval: {
      from: DEFAULT_FROM,
      to: DEFAULT_TO,
    },
  });

  // only show data if the host prevalence is below 10%
  const uncommonData = useMemo(
    () =>
      data.filter(
        (d) =>
          isFinite(d.hostPrevalence) &&
          d.hostPrevalence > 0 &&
          d.hostPrevalence < PERCENTAGE_THRESHOLD
      ),
    [data]
  );

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
        {uncommonData.length > 0 ? (
          uncommonData.map((d) => (
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

PrevalenceOverview.displayName = 'PrevalenceOverview';
