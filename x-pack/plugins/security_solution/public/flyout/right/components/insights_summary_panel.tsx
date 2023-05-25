/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiHealth, EuiPanel } from '@elastic/eui';
import { FormattedCount } from '../../../common/components/formatted_number';

export interface InsightsSummaryPanelData {
  /**
   * Icon to display on the left side of each row
   */
  icon: string;
  /**
   * Number of results/entries found
   */
  value: number;
  /**
   * Text corresponding of the number of results/entries
   */
  text: string;
  /**
   * Optional parameter for now, will be used to display a dot on the right side
   * (corresponding to some sort of severity?)
   */
  color?: string; // TODO remove optional when we have guidance on what the colors will actually be
}

export interface InsightsSummaryPanelProps {
  /**
   * Array of data to display in each row
   */
  data: InsightsSummaryPanelData[];
  /**
   *  Prefix data-test-subj because this component will be used in multiple places
   */
  ['data-test-subj']?: string;
}

/**
 * Panel showing summary information as an icon, a count and text as well as a severity colored dot.
 * Should be used for Entities, Threat Intelligence, Prevalence, Correlations and Results components under the Insights section.
 * The colored dot is currently optional but will ultimately be mandatory (waiting on PM and UIUX).
 */
export const InsightsSummaryPanel: VFC<InsightsSummaryPanelProps> = ({
  data,
  'data-test-subj': dataTestSubj,
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  const iconDataTestSubj = `${dataTestSubj}Icon`;
  const valueDataTestSubj = `${dataTestSubj}Value`;
  const colorDataTestSubj = `${dataTestSubj}Color`;

  return (
    <EuiPanel hasShadow={false} hasBorder={true} paddingSize="s">
      <EuiFlexGroup direction="column" gutterSize="none">
        {data.map((row, index) => (
          <EuiFlexGroup
            gutterSize="none"
            justifyContent={'spaceBetween'}
            alignItems={'center'}
            key={index}
          >
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj={iconDataTestSubj + index}
                aria-label={'entity-icon'}
                color="text"
                display="empty"
                iconType={row.icon}
                size="s"
              />
            </EuiFlexItem>
            <EuiFlexItem
              data-test-subj={valueDataTestSubj + index}
              css={css`
                word-break: break-word;
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
                overflow: hidden;
              `}
            >
              <FormattedCount count={row.value} /> {row.text}
            </EuiFlexItem>
            {row.color && (
              <EuiFlexItem grow={false} data-test-subj={colorDataTestSubj + index}>
                <EuiHealth color={row.color} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

InsightsSummaryPanel.displayName = 'InsightsSummaryPanel';
