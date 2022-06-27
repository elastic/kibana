/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth, EuiToolTip, EuiHealthProps } from '@elastic/eui';
import styled from 'styled-components';

const StatusTextWrapper = styled.div`
  width: 100%;
  display: inline-grid;
`;

interface HealthTruncateTextProps {
  healthColor?: EuiHealthProps['color'];
  tooltipContent?: React.ReactNode;
  dataTestSubj?: string;
}

/**
 * Allows text in EuiHealth to be properly truncated with tooltip
 * @param healthColor - color for EuiHealth component
 * @param tooltipContent - tooltip content
 */
export const HealthTruncateText: React.FC<HealthTruncateTextProps> = ({
  tooltipContent,
  children,
  healthColor,
  dataTestSubj,
}) => (
  <EuiToolTip content={tooltipContent}>
    <EuiHealth color={healthColor} data-test-subj={dataTestSubj}>
      <StatusTextWrapper>
        <span className="eui-textTruncate">{children}</span>
      </StatusTextWrapper>
    </EuiHealth>
  </EuiToolTip>
);

HealthTruncateText.displayName = 'HealthTruncateText';
