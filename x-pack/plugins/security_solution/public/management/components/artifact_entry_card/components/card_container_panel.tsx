/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import { EuiPanel } from '@elastic/eui';
import { EuiPanelProps } from '@elastic/eui/src/components/panel/panel';
import React, { memo } from 'react';

export const EuiPanelStyled = styled(EuiPanel)`
  &.artifactEntryCard + &.artifactEntryCard {
    margin-top: ${({ theme }) => theme.eui.spacerSizes.l};
  }
`;

export type CardContainerPanelProps = Exclude<EuiPanelProps, 'hasBorder' | 'paddingSize'>;

export const CardContainerPanel = memo<CardContainerPanelProps>(({ className, ...props }) => {
  return (
    <EuiPanelStyled
      {...props}
      hasBorder={true}
      paddingSize="none"
      className={`artifactEntryCard ${className ?? ''}`}
    />
  );
});

CardContainerPanel.displayName = 'CardContainerPanel';
