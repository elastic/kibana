/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiPanel, EuiFlexItem, EuiTitle, EuiText, EuiIconTip } from '@elastic/eui';
import {
  summaryPanelActiveDatasetsText,
  summaryPanelActiveDatasetsTooltipText,
  summaryPanelLast24hText,
  tableSummaryOfText,
} from '../../../../common/translations';

export function ActiveDatasets() {
  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{summaryPanelActiveDatasetsText}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip content={summaryPanelActiveDatasetsTooltipText} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexItem>
            <EuiText color="subdued" size="xs">
              {summaryPanelLast24hText}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiTitle size="m">
          <h3>9 {tableSummaryOfText} 10</h3>
        </EuiTitle>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
