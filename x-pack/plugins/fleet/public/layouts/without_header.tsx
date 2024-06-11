/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiPage, EuiPageBody, EuiSpacer, useEuiTheme } from '@elastic/eui';

interface Props {
  restrictWidth?: number;
  children?: React.ReactNode;
}

export const WithoutHeaderLayout: React.FC<Props> = ({ restrictWidth, children }) => {
  // These components should match the ones in `with_header.tsx`
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
      <Page restrictWidth={restrictWidth || 1200}>
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
