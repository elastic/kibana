/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiToolTip } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';
import type { IlmExplainPhaseCounts } from '../../../types';
import { PatternLabel } from './pattern_label';

interface Props {
  ilmExplainPhaseCounts: IlmExplainPhaseCounts;
  pattern: string;
  patternDocsCount: number;
}

const PatternSummaryComponent: React.FC<Props> = ({
  ilmExplainPhaseCounts,
  pattern,
  patternDocsCount,
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
    <EuiFlexItem grow={false}>
      <PatternLabel ilmExplainPhaseCounts={ilmExplainPhaseCounts} pattern={pattern} />
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiToolTip content={i18n.PATTERN_DOCS_COUNT_TOOLTIP(pattern)}>
        <EuiStat description={i18n.DOCS} reverse title={patternDocsCount} titleSize="s" />
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const PatternSummary = React.memo(PatternSummaryComponent);
