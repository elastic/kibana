/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement, VFC } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EuiBadgeProps } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSkeletonText } from '@elastic/eui';

const LOADING = i18n.translate(
  'xpack.securitySolution.flyout.right.insights.insightSummaryLoadingAriaLabel',
  { defaultMessage: 'Loading' }
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
  value: ReactElement;
  /**
   * Decides the color of the badge
   */
  color?: EuiBadgeProps['color'];
  /**
   *  Prefix data-test-subj because this component will be used in multiple places
   */
  ['data-test-subj']?: string;
}

/**
 * Panel showing summary information as an icon, a count and text as well as a severity colored dot.
 * Should be used for Entities, Threat intelligence, Prevalence, Correlations and Results components under the Insights section.
 */
export const InsightsSummaryRow: VFC<InsightsSummaryRowProps> = ({
  loading = false,
  error = false,
  value,
  text,
  color = 'hollow',
  'data-test-subj': dataTestSubj,
}) => {
  const loadingDataTestSubj = `${dataTestSubj}Loading`;
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

  const textDataTestSubj = `${dataTestSubj}Text`;
  const valueDataTestSubj = `${dataTestSubj}Value`;

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
      <EuiFlexItem grow={false} data-test-subj={valueDataTestSubj}>
        <EuiBadge color={color}>{value}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

InsightsSummaryRow.displayName = 'InsightsSummaryRow';
