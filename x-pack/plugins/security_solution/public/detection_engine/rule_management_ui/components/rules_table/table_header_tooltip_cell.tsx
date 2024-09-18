/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiIconTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface Props {
  title: string;
  tooltipContent?: string;
  customTooltip?: React.ReactNode;
}

/**
 * Table header cell component that includes icon(question mark) tooltip with additional details about column
 * Icon tooltip will never be truncated and always be visible for user interaction
 * @param title string - column header title
 * @param tooltipContent string - text content of tooltip
 * @param customTooltip React.ReactNode - any custom tooltip
 */
const TableHeaderTooltipCellComponent = ({ title, tooltipContent, customTooltip }: Props) => (
  <EuiFlexGroup gutterSize="none">
    <EuiFlexItem style={{ width: 'calc(100% - 20px)' }}>
      <span className="eui-textTruncate">{title}</span>
    </EuiFlexItem>
    {customTooltip ?? (
      <EuiIconTip
        content={tooltipContent}
        type="questionInCircle"
        color="subdued"
        anchorProps={{
          css: { marginLeft: 4 },
          'data-test-subj': 'tableHeaderIcon',
        }}
      />
    )}
  </EuiFlexGroup>
);

export const TableHeaderTooltipCell = React.memo(TableHeaderTooltipCellComponent);

TableHeaderTooltipCell.displayName = 'TableHeaderTooltipCell';
