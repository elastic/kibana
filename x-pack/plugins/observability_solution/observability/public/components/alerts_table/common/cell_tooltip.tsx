/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';

interface Props {
  value: string;
  tooltipContent: string;
}

export function CellTooltip({ value, tooltipContent }: Props) {
  return (
    <EuiToolTip content={tooltipContent} data-test-subj="cell-tooltip">
      <>{value}</>
    </EuiToolTip>
  );
}
