/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import type { ReactElement, VFC } from 'react';
import React from 'react';

export interface CellTooltipWrapperProps {
  /**
   * Value displayed in the tooltip and in the cell itself
   */
  tooltip: string | ReactElement;
  /**
   * Tooltip anchor position
   */
  anchorPosition?: 'left' | 'right' | 'top' | 'bottom';
  /**
   * React components to render
   */
  children: React.ReactElement;
}

export const CellTooltipWrapper: VFC<CellTooltipWrapperProps> = ({
  tooltip,
  anchorPosition = 'top',
  children,
}) => (
  <EuiToolTip content={tooltip} position={anchorPosition}>
    {children}
  </EuiToolTip>
);
