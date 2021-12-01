/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiToolTip, EuiIcon, EuiFlexGrid, EuiFlexItem } from '@elastic/eui';

interface Props {
  title: string;
  tooltip?: string;
  customTooltip?: React.ReactNode;
}

/**
 * Table header cell component that includes icon(question mark) tooltip with additional details about column
 * Icon tooltip will never be truncated and always be visible for user interaction
 * @param title string - column header title
 * @param tooltip string - text content of tooltip
 * @param customTooltip React.ReactNode - any custom tooltip
 */
const TableHeaderTooltipCellComponent = ({ title, tooltip, customTooltip }: Props) => (
  <EuiFlexGrid gutterSize="none">
    <EuiFlexItem style={{ width: 'calc(100% - 20px)' }}>
      <span className="eui-textTruncate">{title}</span>
    </EuiFlexItem>
    {customTooltip ?? (
      <EuiToolTip content={tooltip}>
        <EuiIcon size="m" color="subdued" type="questionInCircle" style={{ marginLeft: 4 }} />
      </EuiToolTip>
    )}
  </EuiFlexGrid>
);

export const TableHeaderTooltipCell = React.memo(TableHeaderTooltipCellComponent);

TableHeaderTooltipCell.displayName = 'TableHeaderTooltipCell';
