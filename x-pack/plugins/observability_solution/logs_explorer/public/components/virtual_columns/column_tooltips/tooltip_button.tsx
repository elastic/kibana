/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import ColumnHeaderTruncateContainer from '@kbn/unified-data-table/src/components/column_header_truncate_container';

export const TooltipButtonComponent = ({
  displayText,
  headerRowHeight,
}: {
  displayText?: string;
  headerRowHeight?: number;
}) => (
  <ColumnHeaderTruncateContainer headerRowHeight={headerRowHeight}>
    {displayText} <EuiIcon type="questionInCircle" />
  </ColumnHeaderTruncateContainer>
);
