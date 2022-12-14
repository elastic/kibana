/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiTitle, EuiToolTip } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';

interface Props {
  indexCount: number;
  pattern: string;
  totalDocsCount: number;
}

const PatternSummaryComponent: React.FC<Props> = ({ indexCount, pattern, totalDocsCount }) => (
  <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
    <EuiFlexItem grow={false}>
      <EuiToolTip content={i18n.PATTERN_OR_INDEX_TOOLTIP}>
        <EuiTitle size="s">
          <h4>{pattern}</h4>
        </EuiTitle>
      </EuiToolTip>
      <div>
        <span>
          {i18n.INDICES}
          {': '}
        </span>
        <span>{indexCount}</span>
      </div>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiToolTip content={i18n.TOTAL_DOCS_TOOLTIP(pattern)}>
        <EuiStat description={i18n.DOCS} reverse title={totalDocsCount} titleSize="s" />
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const PatternSummary = React.memo(PatternSummaryComponent);
