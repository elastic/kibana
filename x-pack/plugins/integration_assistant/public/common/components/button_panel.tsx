/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiButton,
  type PropsForAnchor,
  type EuiButtonProps,
} from '@elastic/eui';
import { css } from '@emotion/react';

const alignCenterCss = css`
  text-align: center;
`;

export type ButtonPanelProps = PropsForAnchor<
  EuiButtonProps,
  {
    icon: React.ReactNode;
    title: string;
    description: string;
    buttonLabel: string;
  }
>;
export const ButtonPanel = React.memo<ButtonPanelProps>(
  ({ icon, title, description, buttonLabel, ...buttonProps }) => (
    <EuiPanel hasShadow={true} hasBorder={true} paddingSize="l">
      <EuiFlexGroup direction="column" gutterSize="m" alignItems="center">
        <EuiFlexItem>{icon}</EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3 css={alignCenterCss}>{title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued" textAlign="center">
                {description}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiButton {...buttonProps}>{buttonLabel}</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  )
);
ButtonPanel.displayName = 'ButtonPanel';
