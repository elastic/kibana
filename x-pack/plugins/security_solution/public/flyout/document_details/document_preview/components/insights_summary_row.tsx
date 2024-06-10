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
import {
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiSkeletonText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedCount } from '../../../../common/components/formatted_number';

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
   * Icon to display on the left side of each row
   */
  icon: string;
  /**
   * Number of results/entries found
   */
  value?: number;
  /**
   * Text corresponding of the number of results/entries
   */
  text: string | ReactElement;
  /**
   * Optional parameter for now, will be used to display a dot on the right side
   * (corresponding to some sort of severity?)
   */
  color?: string; // TODO remove optional when we have guidance on what the colors will actually be
  /**
   *  Prefix data-test-subj because this component will be used in multiple places
   */
  ['data-test-subj']?: string;
}

/**
 * Panel showing summary information as an icon, a count and text as well as a severity colored dot.
 * Should be used for Entities, Threat intelligence, Prevalence, Correlations and Results components under the Insights section.
 * The colored dot is currently optional but will ultimately be mandatory (waiting on PM and UIUX).
 */
export const InsightsSummaryRow: VFC<InsightsSummaryRowProps> = ({
  loading = false,
  error = false,
  icon,
  value,
  text,
  color,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();

  const loadingDataTestSubj = `${dataTestSubj}Loading`;
  if (loading) {
    return (
      <EuiSkeletonText
        lines={1}
        size="m"
        isLoading={loading}
        contentAriaLabel={i18n.translate(
          'xpack.securitySolution.flyout.right.insights.insightSummaryLoadingAriaLabel',
          {
            defaultMessage: 'Loading insights for {value}',
            values: { value },
          }
        )}
        data-test-subj={loadingDataTestSubj}
      />
    );
  }

  if (error) {
    return null;
  }

  const iconDataTestSubj = `${dataTestSubj}Icon`;
  const valueDataTestSubj = `${dataTestSubj}Value`;
  const colorDataTestSubj = `${dataTestSubj}Color`;

  return (
    <EuiFlexGroup
      gutterSize="none"
      justifyContent={'spaceBetween'}
      alignItems={'center'}
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon
          css={css`
            margin: ${euiTheme.size.s};
          `}
          data-test-subj={iconDataTestSubj}
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.insights.insightSummaryButtonIconAriaLabel',
            {
              defaultMessage: 'Insight summary row icon',
            }
          )}
          color="text"
          display="empty"
          type={icon}
          size="m"
        />
      </EuiFlexItem>
      <EuiFlexItem
        data-test-subj={valueDataTestSubj}
        css={css`
          word-break: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        `}
      >
        {value && <FormattedCount count={value} />} {text}
      </EuiFlexItem>
      {color && (
        <EuiFlexItem grow={false} data-test-subj={colorDataTestSubj}>
          <EuiHealth color={color} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

InsightsSummaryRow.displayName = 'InsightsSummaryRow';
