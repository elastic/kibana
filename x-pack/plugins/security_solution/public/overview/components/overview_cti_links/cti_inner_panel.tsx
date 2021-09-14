/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSplitPanel, EuiText } from '@elastic/eui';

const PanelContainer = styled(EuiSplitPanel.Inner)`
  margin-bottom: ${({ theme }) => theme.eui.paddingSizes.m};
`;

const ButtonContainer = styled(EuiFlexGroup)`
  padding: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const Title = styled(EuiText)<{ textcolor: 'primary' | 'warning' }>`
  color: ${({ theme, textcolor }) =>
    textcolor === 'primary' ? theme.eui.euiColorPrimary : theme.eui.euiColorWarningText};
  margin-bottom: ${({ theme }) => theme.eui.paddingSizes.m};
`;

const Icon = styled(EuiIcon)`
  padding: 0;
  margin-top: ${({ theme }) => theme.eui.paddingSizes.m};
  margin-left: 12px;
  transform: scale(${({ color }) => (color === 'primary' ? 1.4 : 1)});
`;

export const CtiInnerPanel = ({
  color,
  title,
  body,
  button,
  dataTestSubj,
}: {
  color: 'primary' | 'warning';
  title: string;
  body: string;
  button?: JSX.Element;
  dataTestSubj: string;
}) => {
  const iconType = color === 'primary' ? 'iInCircle' : 'help';
  return (
    <PanelContainer grow={false} color={color}>
      <EuiFlexGroup direction={'column'} data-test-subj={dataTestSubj}>
        <EuiFlexItem>
          <EuiFlexGroup direction={'row'}>
            <Icon type={iconType} size="m" color={color} />
            <EuiFlexItem>
              <Title textcolor={color}>{title}</Title>
            </EuiFlexItem>
          </EuiFlexGroup>
          {body}
        </EuiFlexItem>
        {button && (
          <ButtonContainer>
            <EuiFlexItem grow={false}>{button}</EuiFlexItem>
          </ButtonContainer>
        )}
      </EuiFlexGroup>
    </PanelContainer>
  );
};
