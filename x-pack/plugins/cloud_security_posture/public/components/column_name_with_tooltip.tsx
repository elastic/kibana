/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip, EuiToolTipProps } from '@elastic/eui';
import React, { ReactNode } from 'react';

export const ColumnNameWithTooltip = ({
  tooltipContent,
  columnName,
}: {
  tooltipContent: EuiToolTipProps['content'];
  columnName: ReactNode;
}) => (
  <EuiToolTip content={tooltipContent}>
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem>
        <span>{columnName}</span>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiIcon size="m" color="subdued" type="questionInCircle" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiToolTip>
);
