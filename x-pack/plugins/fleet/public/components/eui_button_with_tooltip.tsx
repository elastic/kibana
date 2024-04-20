/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiToolTipProps } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';

type EuiButtonPropsFull = Parameters<typeof EuiButton>[0];

export const EuiButtonWithTooltip = (
  {
    tooltip: tooltipProps,
    ...buttonProps
  }: EuiButtonPropsFull & {
    tooltip?: Partial<EuiToolTipProps>;
  }
) => {
  return tooltipProps ? (
    <EuiToolTip {...tooltipProps}>
      <EuiButton {...buttonProps} />
    </EuiToolTip>
  ) : (
    <EuiButton {...buttonProps} />
  );
};
