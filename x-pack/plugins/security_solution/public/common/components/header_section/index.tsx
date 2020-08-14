/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiTitle, EuiTitleSize } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

import { InspectButton } from '../inspect';
import { Subtitle } from '../subtitle';

interface HeaderProps {
  border?: boolean;
  height?: number;
}

const Header = styled.header.attrs(() => ({
  className: 'siemHeaderSection',
}))<HeaderProps>`
${({ height }) =>
  height &&
  css`
    height: ${height}px;
  `}
  margin-bottom: ${({ height, theme }) => (height ? 0 : theme.eui.euiSizeL)};
  user-select: text;

  ${({ border }) =>
    border &&
    css`
      border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
      padding-bottom: ${({ theme }) => theme.eui.paddingSizes.l};
    `}
`;
Header.displayName = 'Header';

export interface HeaderSectionProps extends HeaderProps {
  children?: React.ReactNode;
  height?: number;
  id?: string;
  split?: boolean;
  subtitle?: string | React.ReactNode;
  title: string | React.ReactNode;
  titleSize?: EuiTitleSize;
  tooltip?: string;
}

const HeaderSectionComponent: React.FC<HeaderSectionProps> = ({
  border,
  children,
  height,
  id,
  split,
  subtitle,
  title,
  titleSize = 'm',
  tooltip,
}) => (
  <Header data-test-subj="header-section" border={border} height={height}>
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size={titleSize}>
              <h2 data-test-subj="header-section-title">
                {title}
                {tooltip && (
                  <>
                    {' '}
                    <EuiIconTip color="subdued" content={tooltip} size="l" type="iInCircle" />
                  </>
                )}
              </h2>
            </EuiTitle>

            <Subtitle data-test-subj="header-section-subtitle" items={subtitle} />
          </EuiFlexItem>

          {id && (
            <EuiFlexItem grow={false}>
              <InspectButton queryId={id} inspectIndex={0} title={title} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      {children && (
        <EuiFlexItem data-test-subj="header-section-supplements" grow={split ? true : false}>
          {children}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </Header>
);

export const HeaderSection = React.memo(HeaderSectionComponent);
