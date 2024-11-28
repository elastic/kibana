/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAutoSizer } from '@elastic/eui';
import { useDiffableRuleDataView } from '../hooks/use_diffable_rule_data_view';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { ThresholdEdit } from '../../../../../../../rule_creation/components/threshold_edit';

const MIN_ROW_LAYOUT_WIDTH = 560;

interface ThresholdAdapterProps {
  finalDiffableRule: DiffableRule;
}

export function ThresholdAdapter({ finalDiffableRule }: ThresholdAdapterProps): JSX.Element {
  const { dataView } = useDiffableRuleDataView(finalDiffableRule);

  const esFields = dataView?.fields ?? [];

  return (
    <EuiAutoSizer disableHeight>
      {(size) => (
        <div style={{ width: `${size.width}px` }}>
          <ThresholdEdit
            path="threshold"
            esFields={esFields}
            direction={size.width < MIN_ROW_LAYOUT_WIDTH ? 'column' : 'row'}
          />
        </div>
      )}
    </EuiAutoSizer>
  );
}
