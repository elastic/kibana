/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement, VFC } from 'react';
import React, { useMemo, useCallback } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSkeletonText } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useDocumentDetailsContext } from '../../shared/context';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { FormattedCount } from '../../../../common/components/formatted_number';

const LOADING = i18n.translate(
  'xpack.securitySolution.flyout.right.insights.insightSummaryLoadingAriaLabel',
  { defaultMessage: 'Loading' }
);
const BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.right.insights.insightSummaryButtonAriaLabel',
  { defaultMessage: 'Click to see more details' }
);

export interface InsightsSummaryRowProps {
  /**
   * Optional parameter used to display a loading spinner
   */
  loading?: boolean;
  /**
   * Optional parameter used to display a null component
   */
  error?: boolean;
  /**
   * Text corresponding of the number of results/entries
   */
  text: string | ReactElement;
  /**
   * Number of results/entries found
   */
  value: number | ReactElement;
  /**
   * Optional parameter used to know which subtab to navigate to when the user clicks on the button
   */
  expandedSubTab?: string;
  /**
   *  Prefix data-test-subj because this component will be used in multiple places
   */
  ['data-test-subj']?: string;
}

/**
 * Panel showing summary information.
 * The default display is a text on the left and a count on the right, displayed with a clickable EuiBadge.
 * The left and right section can accept a ReactElement to allow for more complex display.
 * Should be used for Entities, Threat intelligence, Prevalence, Correlations and Results components under the Insights section.
 */
export const InsightsSummaryRow: VFC<InsightsSummaryRowProps> = ({
  loading = false,
  error = false,
  value,
  text,
  expandedSubTab,
  'data-test-subj': dataTestSubj,
}) => {
  const { eventId, indexName, scopeId, isPreviewMode } = useDocumentDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();

  const onClick = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
      path: {
        tab: LeftPanelInsightsTab,
        subTab: expandedSubTab,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, expandedSubTab, indexName, openLeftPanel, scopeId]);

  const textDataTestSubj = useMemo(() => `${dataTestSubj}Text`, [dataTestSubj]);
  const loadingDataTestSubj = useMemo(() => `${dataTestSubj}Loading`, [dataTestSubj]);

  const button = useMemo(() => {
    const buttonDataTestSubj = `${dataTestSubj}Button`;
    const valueDataTestSubj = `${dataTestSubj}Value`;

    return (
      <>
        {typeof value === 'number' ? (
          <EuiBadge color="hollow">
            <EuiButtonEmpty
              aria-label={BUTTON}
              onClick={onClick}
              flush={'both'}
              size="xs"
              disabled={isPreviewMode}
              data-test-subj={buttonDataTestSubj}
            >
              <FormattedCount count={value} />
            </EuiButtonEmpty>
          </EuiBadge>
        ) : (
          <div data-test-subj={valueDataTestSubj}>{value}</div>
        )}
      </>
    );
  }, [dataTestSubj, isPreviewMode, onClick, value]);

  if (loading) {
    return (
      <EuiSkeletonText
        lines={1}
        size="m"
        isLoading={loading}
        contentAriaLabel={LOADING}
        data-test-subj={loadingDataTestSubj}
      />
    );
  }

  if (error) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="none"
      justifyContent={'spaceBetween'}
      alignItems={'center'}
      responsive={false}
    >
      <EuiFlexItem
        data-test-subj={textDataTestSubj}
        css={css`
          word-break: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        `}
      >
        {text}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{button}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

InsightsSummaryRow.displayName = 'InsightsSummaryRow';
