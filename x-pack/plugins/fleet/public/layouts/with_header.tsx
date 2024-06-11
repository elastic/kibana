/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import {
  EuiPage,
  EuiPageBody,
  EuiSpacer,
  useIsWithinMinBreakpoint,
  useEuiTheme,
} from '@elastic/eui';

import type { HeaderProps } from '../components';
import { Header } from '../components';

export interface WithHeaderLayoutProps extends HeaderProps {
  restrictWidth?: number;
  restrictHeaderWidth?: number;
  'data-test-subj'?: string;
  children?: React.ReactNode;
}

export const WithHeaderLayout: React.FC<WithHeaderLayoutProps> = ({
  restrictWidth,
  restrictHeaderWidth,
  children,
  'data-test-subj': dataTestSubj,
  ...rest
}) => {
  const isBiggerScreen = useIsWithinMinBreakpoint('xxl');
  const fullWidthSize = isBiggerScreen ? '80%' : '100%';

  // These components should match the ones in `without_header.tsx`
  const { euiTheme } = useEuiTheme();
  const Wrapper = styled.div`
    background-color: ${euiTheme.colors.emptyShade};

    // Set the min height to the viewport size minus the height of any global Kibana headers
    min-height: calc(100vh - var(--euiFixedHeadersOffset, 0));
  `;
  const Page = styled(EuiPage)`
    background: ${euiTheme.colors.emptyShade};
    width: 100%;
    align-self: center;
    margin: auto;
    flex: 1;
  `;
  const ContentWrapper = styled.div`
    height: 100%;
    padding-left: ${euiTheme.size.m};
    padding-right: ${euiTheme.size.m};
  `;

  return (
    <Wrapper>
      <Header
        maxWidth={restrictHeaderWidth || fullWidthSize}
        data-test-subj={dataTestSubj ? `${dataTestSubj}_header` : undefined}
        {...rest}
      />
      <Page
        restrictWidth={restrictWidth || fullWidthSize}
        data-test-subj={dataTestSubj ? `${dataTestSubj}_page` : undefined}
      >
        <EuiPageBody>
          <ContentWrapper>
            <EuiSpacer size="m" />
            {children}
          </ContentWrapper>
        </EuiPageBody>
      </Page>
    </Wrapper>
  );
};
