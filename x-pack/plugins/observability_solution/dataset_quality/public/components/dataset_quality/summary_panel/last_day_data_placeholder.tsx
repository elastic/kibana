/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiIconTip,
  EuiSkeletonTitle,
} from '@elastic/eui';
import { summaryPanelLast24hText } from '../../../../common/translations';

interface LastDayDataPlaceholderParams {
  title: string;
  tooltip: string;
  value: string | number;
  isLoading: boolean;
}

export function LastDayDataPlaceholder({
  title,
  tooltip,
  value,
  isLoading,
}: LastDayDataPlaceholderParams) {
  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiText size="s">{title}</EuiText>
            <EuiFlexItem grow={false}>
              <EuiIconTip content={tooltip} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiText color="subdued" size="xs">
            {summaryPanelLast24hText}
          </EuiText>
        </EuiFlexGroup>
        {isLoading ? (
          <EuiSkeletonTitle size="m" data-test-subj={`datasetQuality-${title}-loading`} />
        ) : (
          <EuiTitle data-test-subj={`datasetQualityDatasetHealthKpi-${title}`} size="m">
            <h3>{value}</h3>
          </EuiTitle>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
