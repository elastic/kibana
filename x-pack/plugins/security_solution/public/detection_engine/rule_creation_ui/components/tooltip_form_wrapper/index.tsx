/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiToolTip } from '@elastic/eui';

interface TooltipFormWrapperProps {
  children: React.ReactNode;
  content: string;
  shouldShowTooltip?: boolean;
}

export const TooltipFormWrapper: React.FC<TooltipFormWrapperProps> = ({
  children,
  content,
  shouldShowTooltip,
}) =>
  shouldShowTooltip ? (
    <EuiToolTip content={content} display="block" position="right">
      <>{children}</>
    </EuiToolTip>
  ) : (
    <>{children}</>
  );
