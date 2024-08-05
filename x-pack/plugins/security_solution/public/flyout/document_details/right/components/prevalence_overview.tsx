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
import { ExpandablePanel } from '@kbn/security-solution-common';
import { usePrevalence } from '../../shared/hooks/use_prevalence';
import { PREVALENCE_TEST_ID } from './test_ids';
import { useDocumentDetailsContext } from '../../shared/context';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
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
    dataFormattedForFieldBrowser,
    scopeId,
    investigationFields,
    isPreviewMode,
  } = useDocumentDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();

  const goPrevalenceTab = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
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
  const link = useMemo(
    () =>
      !isPreviewMode
        ? {
            callback: goPrevalenceTab,
            tooltip: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.insights.prevalence.prevalenceTooltip"
                defaultMessage="Show all prevalence"
              />
            ),
          }
        : undefined,
    [goPrevalenceTab, isPreviewMode]
  );

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.insights.prevalence.prevalenceTitle"
            defaultMessage="Prevalence"
          />
        ),
        link,
        iconType: !isPreviewMode ? 'arrowStart' : undefined,
      }}
      content={{ loading, error }}
      data-test-subj={PREVALENCE_TEST_ID}
    >
      <EuiFlexGroup direction="column" gutterSize="none">
        {uncommonData.length > 0 ? (
          uncommonData.map((d) => (
            <InsightsSummaryRow
              icon={'warning'}
              text={
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.insights.prevalence.rowDescription"
                  defaultMessage="{field}, {value} is uncommon"
                  values={{ field: d.field, value: d.values.toString() }}
                />
              }
              data-test-subj={`${PREVALENCE_TEST_ID}${d.field}`}
              key={`${PREVALENCE_TEST_ID}${d.field}`}
            />
          ))
        ) : (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.insights.prevalence.noDataDescription"
            defaultMessage="No prevalence data available."
          />
        )}
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};

PrevalenceOverview.displayName = 'PrevalenceOverview';
