/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiPanel, EuiTitle, EuiIconTip } from '@elastic/eui';
import { flyoutImprovementText, flyoutImprovementTooltip } from '../../../../common/translations';
import { DegradedFieldTable } from './table';

export function DegradedFields() {
  return (
    <EuiPanel hasBorder grow={false}>
      <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
        <EuiTitle size="xxxs">
          <h6>{flyoutImprovementText}</h6>
        </EuiTitle>
        <EuiIconTip content={flyoutImprovementTooltip} color="subdued" size="m" />
      </EuiFlexGroup>
      <DegradedFieldTable />
    </EuiPanel>
  );
}
