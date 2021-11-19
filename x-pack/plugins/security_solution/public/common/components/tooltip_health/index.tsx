/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiToolTip, EuiToolTipProps } from '@elastic/eui';
import styled from 'styled-components';

const StatusTextWrapper = styled.div`
  width: 100%;
  display: inline-grid;
`;

/**
 * Allows text in EuiHealth to be properly truncated and displays tooltip
 */
export const TooltipHealth = ({ children, ...rest }: Partial<EuiToolTipProps>) => (
  <StatusTextWrapper>
    <EuiToolTip anchorClassName="eui-textTruncate" {...rest}>
      <>{children}</>
    </EuiToolTip>
  </StatusTextWrapper>
);
